import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";

import { useRouter } from "expo-router";

import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

import {
  LoadingState,
  ErrorState,
  ErrorBanner,
  EmptyState,
} from "../components/StateView";

type Patient = {
  _id?: string;
  name?: string;
  phone?: string;
  gender?: string;
  age?: number;
  address?: string;
  tribe?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
};

type LabResult = {
  testName?: string;
  resultValue?: string;
  unit?: string;
  referenceRange?: string;
  status?: string;
  notes?: string;
  performedAt?: string;
};

type Prescription = {
  drugName?: string;
  strength?: string;
  quantity?: number;
  dosage?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
  prescribedAt?: string;
  dispensed?: boolean;
  dispensedQuantity?: number;
  dispensedAt?: string;
  dispensedByName?: string;
};

type Visit = {
  _id: string;
  visitNumber?: string;
  status: string;
  currentDepartment: string;
  notes?: string;
  createdAt?: string;
  startedAt?: string;
  updatedAt?: string;
  patient?: Patient;
  labResults?: LabResult[];
  prescriptions?: Prescription[];
  vitals?: {
    bloodPressure?: {
      systolic?: number;
      diastolic?: number;
    };
    temperatureC?: number;
    pulseBpm?: number;
    weightKg?: number;
  };
};

type PendingAction = {
  visitId: string;
  status: string;
  label: string;
  patientName: string;
};

type PrescriptionInput = {
  id: string;
  drugName: string;
  strength: string;
  quantity: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions: string;
};

const INTERPRETATION_STATUSES = ["waiting_interpretation"];

const MOVES_BY_STATUS: Record<string, string[]> = {
  waiting_interpretation: [
    "waiting_billing",
    "completed",
    "cancelled",
  ],
};

const ACTION_LABELS: Record<string, string> = {
  waiting_billing: "Send to Billing",
  completed: "Complete Visit",
  cancelled: "Cancel Visit",
};

const ACTION_NOTES: Record<string, string> = {
  waiting_billing:
    "Doctor interpreted results and sent patient to billing",
  completed: "Doctor completed visit after interpretation",
  cancelled: "Visit cancelled during interpretation",
};

function makeEmptyPrescription(): PrescriptionInput {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    drugName: "",
    strength: "",
    quantity: "",
    dosage: "",
    frequency: "",
    duration: "",
    instructions: "",
  };
}

function humanize(value?: string) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function formatDate(value?: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getVisitStatusColor(status: string) {
  switch (status) {
    case "waiting_consultation":
      return "#2563eb";
    case "in_consultation":
      return "#7c3aed";
    case "waiting_procedure":
      return "#9333ea";
    case "procedure_in_progress":
      return "#6d28d9";
    case "waiting_lab":
      return "#0891b2";
    case "lab_in_progress":
      return "#0e7490";
    case "waiting_interpretation":
      return "#b45309";
    case "waiting_billing":
      return "#ca8a04";
    case "waiting_dispensary":
      return "#16a34a";
    case "completed":
      return "#15803d";
    case "cancelled":
      return "#b91c1c";
    case "no_show":
      return "#6b7280";
    default:
      return "#374151";
  }
}

function getLabStatusColor(status?: string) {
  switch (status) {
    case "normal":
      return "#15803d";
    case "abnormal":
      return "#b45309";
    case "critical":
      return "#b91c1c";
    case "pending":
      return "#6b7280";
    default:
      return "#374151";
  }
}

function showMessage(title: string, message: string) {
  if (
    Platform.OS === "web" &&
    typeof (globalThis as any).alert === "function"
  ) {
    (globalThis as any).alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
}

function getAllowedActions(role?: string, currentStatus?: string) {
  if (!role || !currentStatus) return [];

  const moves = MOVES_BY_STATUS[currentStatus] || [];

  if (role === "admin" || role === "doctor") {
    return moves;
  }

  return [];
}

export default function InterpretationScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );
  const [actionNotes, setActionNotes] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const [prescriptions, setPrescriptions] = useState<PrescriptionInput[]>([
    makeEmptyPrescription(),
  ]);

  const canInterpret =
    user?.role === "admin" || user?.role === "doctor";

  const loadVisits = useCallback(
    async (isRefresh = false) => {
      if (!user) {
        router.replace("/");
        return;
      }

      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const res = await API.get("/visits", {
          params: {
            department: "interpretation",
          },
        });

        const allVisits = Array.isArray(res.data) ? res.data : [];

        const interpretationVisits = allVisits.filter((visit: Visit) =>
          INTERPRETATION_STATUSES.includes(visit.status)
        );

        const sorted = [...interpretationVisits].sort((a, b) => {
          return (
            new Date(a.createdAt || 0).getTime() -
            new Date(b.createdAt || 0).getTime()
          );
        });

        setVisits(sorted);
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load interpretation queue";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (status === 403) {
          setError(
            message ||
              "Only doctors and administrators can access interpretation."
          );
          setVisits([]);
          return;
        }

        setError(message);
        setVisits([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [logout, router, user]
  );

  useEffect(() => {
    loadVisits(false);
  }, [loadVisits]);

  const resetAction = () => {
    setPendingAction(null);
    setActionNotes("");
    setPrescriptions([makeEmptyPrescription()]);
  };

  const openAction = (visit: Visit, status: string) => {
    const label = ACTION_LABELS[status] || humanize(status);

    setPendingAction({
      visitId: visit._id,
      status,
      label,
      patientName: visit.patient?.name || "Unknown Patient",
    });

    setActionNotes(ACTION_NOTES[status] || "");

    if (status === "waiting_billing" || status === "waiting_dispensary") {
      setPrescriptions([makeEmptyPrescription()]);
    } else {
      setPrescriptions([]);
    }
  };

  const addPrescription = () => {
    setPrescriptions((prev) => [...prev, makeEmptyPrescription()]);
  };

  const removePrescription = (index: number) => {
    setPrescriptions((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    );
  };

  const updatePrescription = (
    index: number,
    field: keyof PrescriptionInput,
    value: string
  ) => {
    setPrescriptions((prev) =>
      prev.map((row, i) =>
        i === index
          ? {
              ...row,
              [field]: value,
            }
          : row
      )
    );
  };

  const buildPrescriptionsPayload = (): {
    error: string | null;
    data: any[] | null | undefined;
  } => {
    if (!pendingAction) {
      return { error: null, data: undefined };
    }

    if (
      pendingAction.status !== "waiting_billing" &&
      pendingAction.status !== "waiting_dispensary"
    ) {
      return { error: null, data: undefined };
    }

    const cleaned = prescriptions
      .map((row) => ({
        drugName: row.drugName.trim(),
        strength: row.strength.trim(),
        quantity: row.quantity.trim(),
        dosage: row.dosage.trim(),
        frequency: row.frequency.trim(),
        duration: row.duration.trim(),
        instructions: row.instructions.trim(),
      }))
      .filter(
        (row) =>
          row.drugName ||
          row.quantity ||
          row.strength ||
          row.dosage ||
          row.frequency ||
          row.duration ||
          row.instructions
      );

    if (cleaned.length === 0) {
      return {
        error: null,
        data: undefined,
      };
    }

    for (const row of cleaned) {
      if (!row.drugName) {
        return {
          error: "Each prescription needs a drug name.",
          data: null,
        };
      }

      const quantity = Number(row.quantity);

      if (!Number.isFinite(quantity) || quantity <= 0) {
        return {
          error:
            "Each prescription needs a valid quantity greater than zero.",
          data: null,
        };
      }
    }

    return {
      error: null,
      data: cleaned.map((row) => ({
        drugName: row.drugName,
        strength: row.strength || undefined,
        quantity: Number(row.quantity),
        dosage: row.dosage || undefined,
        frequency: row.frequency || undefined,
        duration: row.duration || undefined,
        instructions: row.instructions || undefined,
      })),
    };
  };

  const confirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    const prescriptionResult = buildPrescriptionsPayload();

    if (prescriptionResult.error) {
      showMessage(
        "Prescription error",
        prescriptionResult.error
      );
      return;
    }

    const payload: any = {
      status: pendingAction.status,
      notes:
        actionNotes.trim() ||
        ACTION_NOTES[pendingAction.status] ||
        "Interpretation action",
    };

    if (prescriptionResult.data) {
      payload.prescriptions = prescriptionResult.data;
    }

    try {
      setSubmittingAction(true);
      setError(null);

      await API.patch(`/visits/${pendingAction.visitId}/move`, payload);

      showMessage("Success", `${pendingAction.label} completed.`);

      resetAction();
      await loadVisits(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update visit";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
      showMessage("Action failed", message);
    } finally {
      setSubmittingAction(false);
    }
  };

  const waitingCount = useMemo(
    () =>
      visits.filter((visit) => visit.status === "waiting_interpretation")
        .length,
    [visits]
  );

  if (loading) {
    return (
      <LoadingState
        title="Loading interpretation queue..."
        subtitle="Please wait while laboratory results waiting for doctor review load."
      />
    );
  }

  if (!canInterpret) {
    return (
      <ErrorState
        message="Only doctors and administrators can access interpretation."
        onRetry={() => router.replace("/worklist")}
      />
    );
  }

  if (error && visits.length === 0) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadVisits(false)}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadVisits(true)}
        />
      }
    >
      <Text style={styles.title}>🧪 Result Interpretation</Text>

      <Text style={styles.subtitle}>
        Review laboratory results, add prescription if needed, and send the
        patient to billing or complete the visit.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Waiting Interpretation</Text>
          <Text style={styles.summaryValue}>{waitingCount}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Queue</Text>
          <Text style={styles.summaryValue}>{visits.length}</Text>
        </View>
      </View>

      <ErrorBanner message={error} />

      {pendingAction ? (
        <View style={styles.actionPanel}>
          <Text style={styles.actionPanelTitle}>
            {pendingAction.label}
          </Text>

          <Text style={styles.actionPanelSubtitle}>
            Patient: {pendingAction.patientName}
          </Text>

          <Text style={styles.label}>Interpretation Note</Text>

          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={actionNotes}
            onChangeText={setActionNotes}
            placeholder="Enter interpretation, diagnosis, or next action"
            multiline
            editable={!submittingAction}
          />

          {pendingAction.status === "waiting_billing" ? (
            <View style={styles.prescriptionSection}>
              <Text style={styles.sectionTitle}>Prescription</Text>

              <Text style={styles.infoText}>
                Add prescribed medicines if the patient needs medication.
                This prescription will move with the patient to billing and
                then to dispensary.
              </Text>

              {prescriptions.map((row, index) => (
                <View key={row.id} style={styles.prescriptionRow}>
                  <View style={styles.prescriptionHeader}>
                    <Text style={styles.prescriptionIndex}>
                      Medicine #{index + 1}
                    </Text>

                    {prescriptions.length > 1 ? (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removePrescription(index)}
                        disabled={submittingAction}
                      >
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <Text style={styles.label}>Drug Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={row.drugName}
                    onChangeText={(value) =>
                      updatePrescription(index, "drugName", value)
                    }
                    placeholder="e.g. Paracetamol"
                    editable={!submittingAction}
                  />

                  <View style={styles.row}>
                    <View style={styles.halfField}>
                      <Text style={styles.label}>Strength</Text>
                      <TextInput
                        style={styles.input}
                        value={row.strength}
                        onChangeText={(value) =>
                          updatePrescription(index, "strength", value)
                        }
                        placeholder="e.g. 500mg"
                        editable={!submittingAction}
                      />
                    </View>

                    <View style={styles.halfField}>
                      <Text style={styles.label}>Quantity *</Text>
                      <TextInput
                        style={styles.input}
                        value={row.quantity}
                        onChangeText={(value) =>
                          updatePrescription(index, "quantity", value)
                        }
                        keyboardType="numeric"
                        placeholder="e.g. 10"
                        editable={!submittingAction}
                      />
                    </View>
                  </View>

                  <View style={styles.row}>
                    <View style={styles.halfField}>
                      <Text style={styles.label}>Dosage</Text>
                      <TextInput
                        style={styles.input}
                        value={row.dosage}
                        onChangeText={(value) =>
                          updatePrescription(index, "dosage", value)
                        }
                        placeholder="e.g. 1 tablet"
                        editable={!submittingAction}
                      />
                    </View>

                    <View style={styles.halfField}>
                      <Text style={styles.label}>Frequency</Text>
                      <TextInput
                        style={styles.input}
                        value={row.frequency}
                        onChangeText={(value) =>
                          updatePrescription(index, "frequency", value)
                        }
                        placeholder="e.g. Three times daily"
                        editable={!submittingAction}
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>Duration</Text>
                  <TextInput
                    style={styles.input}
                    value={row.duration}
                    onChangeText={(value) =>
                      updatePrescription(index, "duration", value)
                    }
                    placeholder="e.g. 3 days"
                    editable={!submittingAction}
                  />

                  <Text style={styles.label}>Instructions</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    value={row.instructions}
                    onChangeText={(value) =>
                      updatePrescription(index, "instructions", value)
                    }
                    placeholder="e.g. Take after food"
                    multiline
                    editable={!submittingAction}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={styles.addButton}
                onPress={addPrescription}
                disabled={submittingAction}
              >
                <Text style={styles.addButtonText}>
                  + Add Another Medicine
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <TouchableOpacity
            style={[
              styles.primaryButton,
              submittingAction && styles.disabledButton,
            ]}
            onPress={confirmAction}
            disabled={submittingAction}
          >
            {submittingAction ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.primaryButtonText}>Saving...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>
                Confirm {pendingAction.label}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={resetAction}
            disabled={submittingAction}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!error && visits.length === 0 ? (
        <EmptyState
          title="No patients are currently waiting for interpretation."
          subtitle="Laboratory staff can send results here after testing."
        />
      ) : null}

      {visits.map((visit) => {
        const patient = visit.patient || {};
        const actions = getAllowedActions(user?.role, visit.status);

        return (
          <View key={visit._id} style={styles.card}>
            <Text style={styles.patientName}>
              {patient.name || "Unknown Patient"}
            </Text>

            <Text style={styles.detail}>
              Phone: {patient.phone || "—"}
            </Text>

            <Text style={styles.detail}>
              Gender: {patient.gender || "—"}
            </Text>

            <Text style={styles.detail}>
              Age: {patient.age ?? "—"}
            </Text>

            <Text style={styles.detail}>
              Address: {patient.address || "—"}
            </Text>

            <Text style={styles.detail}>
              Tribe: {patient.tribe || "—"}
            </Text>

            <Text
              style={[
                styles.detail,
                { color: "#b91c1c", fontWeight: "bold" },
              ]}
            >
              🚨 Next of Kin: {patient.nextOfKinName || "—"} (
              {patient.nextOfKinPhone || "No phone"})
            </Text>

            <View style={styles.divider} />

            <Text style={styles.detail}>
              Visit Number: {visit.visitNumber || "—"}
            </Text>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getVisitStatusColor(visit.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {humanize(visit.status)}
              </Text>
            </View>

            <Text style={styles.detail}>
              Department: {humanize(visit.currentDepartment)}
            </Text>

            <Text style={styles.detail}>
              Registered: {formatDate(visit.createdAt)}
            </Text>

            {visit.notes ? (
              <Text style={styles.note}>
                Previous Note: {visit.notes}
              </Text>
            ) : null}

            {visit.vitals && Object.keys(visit.vitals).length > 0 ? (
              <>
                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>Current Vitals</Text>

                {visit.vitals.bloodPressure ? (
                  <Text style={styles.detail}>
                    BP:{" "}
                    {visit.vitals.bloodPressure.systolic}/
                    {visit.vitals.bloodPressure.diastolic}
                  </Text>
                ) : null}

                {visit.vitals.temperatureC !== undefined ? (
                  <Text style={styles.detail}>
                    Temp: {visit.vitals.temperatureC} °C
                  </Text>
                ) : null}

                {visit.vitals.pulseBpm !== undefined ? (
                  <Text style={styles.detail}>
                    Pulse: {visit.vitals.pulseBpm} bpm
                  </Text>
                ) : null}

                {visit.vitals.weightKg !== undefined ? (
                  <Text style={styles.detail}>
                    Weight: {visit.vitals.weightKg} kg
                  </Text>
                ) : null}
              </>
            ) : null}

            {visit.labResults && visit.labResults.length > 0 ? (
              <>
                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>
                  Laboratory Results
                </Text>

                {visit.labResults.map((result, index) => (
                  <View
                    key={`${result.testName}-${index}`}
                    style={styles.resultPreview}
                  >
                    <Text style={styles.resultPreviewName}>
                      {result.testName || "Unknown test"}
                    </Text>

                    <Text style={styles.resultPreviewValue}>
                      Result: {result.resultValue || "—"}
                    </Text>

                    {result.unit ? (
                      <Text style={styles.detail}>Unit: {result.unit}</Text>
                    ) : null}

                    {result.referenceRange ? (
                      <Text style={styles.detail}>
                        Reference: {result.referenceRange}
                      </Text>
                    ) : null}

                    <View
                      style={[
                        styles.resultStatusPill,
                        {
                          backgroundColor: getLabStatusColor(
                            result.status
                          ),
                        },
                      ]}
                    >
                      <Text style={styles.resultStatusText}>
                        {humanize(result.status)}
                      </Text>
                    </View>

                    {result.notes ? (
                      <Text style={styles.note}>{result.notes}</Text>
                    ) : null}

                    {result.performedAt ? (
                      <Text style={styles.detail}>
                        Recorded: {formatDate(result.performedAt)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </>
            ) : (
              <>
                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>
                  Laboratory Results
                </Text>

                <Text style={styles.note}>
                  No laboratory results were recorded for this visit.
                </Text>
              </>
            )}

            {visit.prescriptions && visit.prescriptions.length > 0 ? (
              <>
                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>
                  Existing Prescriptions
                </Text>

                {visit.prescriptions.map((rx, index) => (
                  <View
                    key={`${rx.drugName}-${index}`}
                    style={styles.prescriptionPreview}
                  >
                    <Text style={styles.prescriptionPreviewName}>
                      {rx.drugName || "Unknown medicine"}
                      {rx.strength ? ` ${rx.strength}` : ""}
                    </Text>

                    <Text style={styles.detail}>
                      Quantity: {rx.quantity ?? "—"}
                    </Text>

                    {rx.dosage ? (
                      <Text style={styles.detail}>
                        Dosage: {rx.dosage}
                      </Text>
                    ) : null}

                    {rx.frequency ? (
                      <Text style={styles.detail}>
                        Frequency: {rx.frequency}
                      </Text>
                    ) : null}

                    {rx.duration ? (
                      <Text style={styles.detail}>
                        Duration: {rx.duration}
                      </Text>
                    ) : null}

                    {rx.instructions ? (
                      <Text style={styles.note}>
                        {rx.instructions}
                      </Text>
                    ) : null}

                    <Text
                      style={[
                        styles.detail,
                        {
                          color: rx.dispensed
                            ? "#15803d"
                            : Number(rx.dispensedQuantity || 0) > 0
                            ? "#b45309"
                            : "#6b7280",
                          fontWeight: "600",
                        },
                      ]}
                    >
                      Dispensed:{" "}
                      {rx.dispensed
                        ? "Yes"
                        : Number(rx.dispensedQuantity || 0) > 0
                        ? "Partial"
                        : "No"}
                    </Text>
                  </View>
                ))}
              </>
            ) : null}

            <View style={styles.divider} />

            <Text style={styles.actionTitle}>
              Interpretation Actions
            </Text>

            {actions.length === 0 ? (
              <Text style={styles.noActionText}>
                No actions available for this patient.
              </Text>
            ) : (
              actions.map((actionStatus) => {
                const label =
                  ACTION_LABELS[actionStatus] || humanize(actionStatus);

                return (
                  <TouchableOpacity
                    key={actionStatus}
                    disabled={submittingAction}
                    onPress={() => openAction(visit, actionStatus)}
                    style={[
                      styles.actionButton,
                      actionStatus === "waiting_billing" &&
                        styles.billingButton,
                      actionStatus === "completed" &&
                        styles.successButton,
                      actionStatus === "cancelled" &&
                        styles.dangerButton,
                      submittingAction && styles.disabledButton,
                    ]}
                  >
                    <Text style={styles.actionButtonText}>
                      {label}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
    backgroundColor: "#f9fafb",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 8,
  },

  metaText: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 16,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 16,
  },

  summaryCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minWidth: 140,
    flexGrow: 1,
  },

  summaryLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 6,
  },

  summaryValue: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#111827",
  },

  actionPanel: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: "#b45309",
  },

  actionPanelTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },

  actionPanelSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },

  prescriptionSection: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 0,
    marginBottom: 8,
  },

  sectionLabel: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#111827",
  },

  infoText: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#111827",
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  halfField: {
    flex: 1,
  },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 15,
  },

  multilineInput: {
    minHeight: 90,
    textAlignVertical: "top",
  },

  prescriptionRow: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginBottom: 12,
  },

  prescriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  prescriptionIndex: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
  },

  removeButton: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  removeText: {
    color: "#b91c1c",
    fontWeight: "600",
  },

  addButton: {
    backgroundColor: "#16a34a",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  addButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },

  primaryButton: {
    backgroundColor: "#b45309",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  secondaryButton: {
    backgroundColor: "#e5e7eb",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#111827",
    fontWeight: "600",
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  patientName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 10,
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 8,
  },

  statusText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13,
  },

  note: {
    marginTop: 8,
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
  },

  resultPreview: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },

  resultPreviewName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },

  resultPreviewValue: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  resultStatusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginTop: 6,
    marginBottom: 6,
  },

  resultStatusText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
  },

  prescriptionPreview: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },

  prescriptionPreviewName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },

  noActionText: {
    fontSize: 14,
    color: "#6b7280",
  },

  actionButton: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8,
  },

  billingButton: {
    backgroundColor: "#ca8a04",
  },

  successButton: {
    backgroundColor: "#15803d",
  },

  dangerButton: {
    backgroundColor: "#dc2626",
  },

  disabledButton: {
    opacity: 0.6,
  },

  actionButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
});
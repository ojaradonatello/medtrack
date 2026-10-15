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
  enteredBy?: string;
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

type LabResultInput = {
  id: string;
  testName: string;
  resultValue: string;
  status: string;
  notes: string;
};

const LAB_STATUSES = ["waiting_lab", "lab_in_progress"];

const LAB_ALLOWED_TARGETS = [
  "lab_in_progress",
  "waiting_interpretation",
  "waiting_billing",
  "cancelled",
];

const MOVES_BY_STATUS: Record<string, string[]> = {
  waiting_lab: ["lab_in_progress", "waiting_billing", "cancelled"],
  lab_in_progress: [
    "waiting_interpretation",
    "waiting_billing",
    "cancelled",
  ],
};

const ACTION_LABELS: Record<string, string> = {
  lab_in_progress: "Start Lab Test",
  waiting_interpretation: "Send to Interpretation",
  waiting_billing: "Send to Billing",
  cancelled: "Cancel Visit",
};

const ACTION_NOTES: Record<string, string> = {
  lab_in_progress: "Laboratory started test",
  waiting_interpretation: "Laboratory sent results for interpretation",
  waiting_billing: "Laboratory sent patient to billing",
  cancelled: "Visit cancelled by laboratory",
};

const RESULT_STATUSES = [
  { value: "normal", label: "Normal" },
  { value: "abnormal", label: "Abnormal" },
  { value: "critical", label: "Critical" },
  { value: "pending", label: "Pending" },
];

function makeEmptyResult(): LabResultInput {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    testName: "",
    resultValue: "",
    status: "normal",
    notes: "",
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

function getStatusColor(status: string) {
  switch (status) {
    case "waiting_consultation":
      return "#2563eb";
    case "in_consultation":
      return "#7c3aed";
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

function getResultColor(status?: string) {
  switch (status) {
    case "normal":
      return "#16a34a";
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

  if (role === "admin") {
    return moves;
  }

  if (role === "lab") {
    return moves.filter((status) => LAB_ALLOWED_TARGETS.includes(status));
  }

  return [];
}

export default function LaboratoryScreen() {
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

  const [results, setResults] = useState<LabResultInput[]>([
    makeEmptyResult(),
  ]);

  const canUseLaboratory =
    user?.role === "admin" || user?.role === "lab";

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
            department: "laboratory",
          },
        });

        const allVisits = Array.isArray(res.data) ? res.data : [];

        const labVisits = allVisits.filter((visit: Visit) =>
          LAB_STATUSES.includes(visit.status)
        );

        const sorted = [...labVisits].sort((a, b) => {
          const aWeight = a.status === "waiting_lab" ? 0 : 1;
          const bWeight = b.status === "waiting_lab" ? 0 : 1;

          if (aWeight !== bWeight) {
            return aWeight - bWeight;
          }

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
          "Failed to load laboratory queue";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (status === 403) {
          setError(
            message ||
              "Only laboratory staff and administrators can access this screen."
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
    setResults([makeEmptyResult()]);
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

    if (status === "waiting_interpretation") {
      setResults([makeEmptyResult()]);
    } else {
      setResults([]);
    }
  };

  const addResult = () => {
    setResults((prev) => [...prev, makeEmptyResult()]);
  };

  const removeResult = (index: number) => {
    setResults((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    );
  };

  const updateResult = (
    index: number,
    field: keyof LabResultInput,
    value: string
  ) => {
    setResults((prev) =>
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

  const buildLabResultsPayload = (): {
    error: string | null;
    data: any[] | null | undefined;
  } => {
    if (!pendingAction) {
      return { error: null, data: undefined };
    }

    if (pendingAction.status !== "waiting_interpretation") {
      return { error: null, data: undefined };
    }

    const cleaned = results
      .map((row) => ({
        testName: row.testName.trim(),
        resultValue: row.resultValue.trim(),
        status: row.status.trim() || "normal",
        notes: row.notes.trim(),
      }))
      .filter((row) => row.testName || row.resultValue || row.notes);

    if (cleaned.length === 0) {
      return {
        error:
          "Add at least one lab result before sending to interpretation.",
        data: null,
      };
    }

    for (const row of cleaned) {
      if (!row.testName) {
        return {
          error: "Each lab result needs a test name.",
          data: null,
        };
      }

      if (!row.resultValue) {
        return {
          error: "Each lab result needs a result value.",
          data: null,
        };
      }
    }

    return {
      error: null,
      data: cleaned.map((row) => ({
        testName: row.testName,
        resultValue: row.resultValue,
        status: row.status,
        notes: row.notes || undefined,
      })),
    };
  };

  const confirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    const labCheck = buildLabResultsPayload();

    if (labCheck.error) {
      showMessage("Lab result required", labCheck.error);
      return;
    }

    const payload: any = {
      status: pendingAction.status,
      notes:
        actionNotes.trim() ||
        ACTION_NOTES[pendingAction.status] ||
        "Laboratory action",
    };

    if (labCheck.data) {
      payload.labResults = labCheck.data;
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

  const requestAction = (visit: Visit, status: string) => {
    const doIt = () => openAction(visit, status);

    if (Platform.OS === "web") {
      const browserWindow = globalThis as any;

      const confirmed = browserWindow.confirm
        ? browserWindow.confirm(
            `Are you sure you want to ${
              ACTION_LABELS[status] || humanize(status)
            }?`
          )
        : true;

      if (!confirmed) {
        return;
      }

      doIt();
      return;
    }

    Alert.alert(
      "Confirm Action",
      `Are you sure you want to ${
        ACTION_LABELS[status] || humanize(status)
      }?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: doIt,
        },
      ]
    );
  };

  const waitingCount = useMemo(
    () => visits.filter((visit) => visit.status === "waiting_lab").length,
    [visits]
  );

  const inProgressCount = useMemo(
    () =>
      visits.filter((visit) => visit.status === "lab_in_progress").length,
    [visits]
  );

  if (loading) {
    return (
      <LoadingState
        title="Loading laboratory queue..."
        subtitle="Please wait while lab patients load."
      />
    );
  }

  if (!canUseLaboratory) {
    return (
      <ErrorState
        message="Only laboratory staff and administrators can access this screen."
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
      <Text style={styles.title}>🧫 Laboratory</Text>

      <Text style={styles.subtitle}>
        Process laboratory samples, record test results, and route patients
        to interpretation or billing.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Waiting for Lab</Text>
          <Text style={styles.summaryValue}>{waitingCount}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Lab In Progress</Text>
          <Text style={styles.summaryValue}>{inProgressCount}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Lab Queue</Text>
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

          <Text style={styles.label}>Laboratory Note</Text>

          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={actionNotes}
            onChangeText={setActionNotes}
            placeholder="Enter sample details, test name, or lab note"
            multiline
            editable={!submittingAction}
          />

          {pendingAction.status === "waiting_interpretation" ? (
            <View style={styles.labSection}>
              <Text style={styles.sectionTitle}>Lab Results</Text>

              <Text style={styles.infoText}>
                Enter at least one test result before sending the patient
                for interpretation.
              </Text>

              {results.map((row, index) => (
                <View key={row.id} style={styles.resultRow}>
                  <View style={styles.resultHeader}>
                    <Text style={styles.resultIndex}>
                      Result #{index + 1}
                    </Text>

                    {results.length > 1 ? (
                      <TouchableOpacity
                        style={styles.removeButton}
                        onPress={() => removeResult(index)}
                        disabled={submittingAction}
                      >
                        <Text style={styles.removeText}>Remove</Text>
                      </TouchableOpacity>
                    ) : null}
                  </View>

                  <Text style={styles.label}>Test Name</Text>
                  <TextInput
                    style={styles.input}
                    value={row.testName}
                    onChangeText={(value) =>
                      updateResult(index, "testName", value)
                    }
                    placeholder="e.g. Malaria Parasite"
                    editable={!submittingAction}
                  />

                  <Text style={styles.label}>Result Value</Text>
                  <TextInput
                    style={styles.input}
                    value={row.resultValue}
                    onChangeText={(value) =>
                      updateResult(index, "resultValue", value)
                    }
                    placeholder="e.g. Positive"
                    editable={!submittingAction}
                  />

                  <Text style={styles.label}>Result Status</Text>

                  <View style={styles.statusRow}>
                    {RESULT_STATUSES.map((statusOption) => {
                      const active = row.status === statusOption.value;

                      return (
                        <TouchableOpacity
                          key={statusOption.value}
                          onPress={() =>
                            updateResult(
                              index,
                              "status",
                              statusOption.value
                            )
                          }
                          style={[
                            styles.statusButton,
                            active && styles.statusButtonActive,
                          ]}
                          disabled={submittingAction}
                        >
                          <Text
                            style={[
                              styles.statusOptionText,
                              active && styles.statusOptionTextActive,
                            ]}
                          >
                            {statusOption.label}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  <Text style={styles.label}>Notes (optional)</Text>
                  <TextInput
                    style={[styles.input, styles.multilineInput]}
                    value={row.notes}
                    onChangeText={(value) =>
                      updateResult(index, "notes", value)
                    }
                    placeholder="Optional comment for this result"
                    multiline
                    editable={!submittingAction}
                  />
                </View>
              ))}

              <TouchableOpacity
                style={styles.addButton}
                onPress={addResult}
                disabled={submittingAction}
              >
                <Text style={styles.addButtonText}>
                  + Add Another Result
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
          title="No patients are currently in the laboratory queue."
          subtitle="Send a patient from doctor consultation to laboratory first."
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
                { backgroundColor: getStatusColor(visit.status) },
              ]}
            >
              <Text style={styles.visitStatusText}>
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

                <Text style={styles.sectionLabel}>Entered Lab Results</Text>

                {visit.labResults.map((result, index) => (
                  <View
                    key={`${result.testName}-${index}`}
                    style={styles.resultPreview}
                  >
                    <Text style={styles.resultPreviewName}>
                      {result.testName || "Unknown test"}
                    </Text>

                    <Text style={styles.resultPreviewValue}>
                      {result.resultValue || "—"}
                    </Text>

                    <View
                      style={[
                        styles.resultStatusBadge,
                        {
                          backgroundColor: getResultColor(result.status),
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
                  </View>
                ))}
              </>
            ) : null}

            <View style={styles.divider} />

            <Text style={styles.actionTitle}>
              Laboratory Actions
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
                    onPress={() => requestAction(visit, actionStatus)}
                    style={[
                      styles.actionButton,
                      actionStatus === "cancelled" && styles.dangerButton,
                      actionStatus === "waiting_interpretation" &&
                        styles.interpretationButton,
                      actionStatus === "waiting_billing" &&
                        styles.billingButton,
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
    borderColor: "#2563eb",
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

  labSection: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
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
    minHeight: 80,
    textAlignVertical: "top",
  },

  resultRow: {
    backgroundColor: "#ffffff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },

  resultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  resultIndex: {
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

  statusRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  statusButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },

  statusButtonActive: {
    backgroundColor: "#2563eb",
  },

  statusOptionText: {
    color: "#111827",
    fontWeight: "600",
  },

  statusOptionTextActive: {
    color: "#ffffff",
  },

  addButton: {
    backgroundColor: "#e5e7eb",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  addButtonText: {
    color: "#111827",
    fontWeight: "bold",
  },

  primaryButton: {
    backgroundColor: "#2563eb",
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

  visitStatusText: {
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
    marginBottom: 8,
  },

  resultStatusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  resultStatusText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
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

  interpretationButton: {
    backgroundColor: "#b45309",
  },

  billingButton: {
    backgroundColor: "#ca8a04",
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
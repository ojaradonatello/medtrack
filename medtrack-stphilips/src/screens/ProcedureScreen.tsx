import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  Switch,
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

type Procedure = {
  procedureName?: string;
  treatmentGiven?: string;
  emergency?: boolean;
  notes?: string;
  outcome?: string;
  performedAt?: string;
  performedBy?: string;
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
  procedures?: Procedure[];
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

const PROCEDURE_STATUSES = ["waiting_procedure", "procedure_in_progress"];

const MOVES_BY_STATUS: Record<string, string[]> = {
  waiting_procedure: ["procedure_in_progress", "cancelled"],

  procedure_in_progress: [
    "waiting_lab",
    "waiting_billing",
    "waiting_dispensary",
    "completed",
    "cancelled",
  ],
};

const ACTION_LABELS: Record<string, string> = {
  procedure_in_progress: "Start / Record Procedure",
  waiting_lab: "Send to Laboratory",
  waiting_billing: "Send to Billing",
  waiting_dispensary: "Send to Dispensary",
  completed: "Complete Visit",
  cancelled: "Cancel Visit",
};

const ACTION_NOTES: Record<string, string> = {
  procedure_in_progress: "Procedure/treatment started and recorded",
  waiting_lab: "Procedure room sent patient to laboratory",
  waiting_billing: "Procedure room sent patient to billing",
  waiting_dispensary: "Procedure room sent patient to dispensary",
  completed: "Procedure room completed visit",
  cancelled: "Visit cancelled by procedure room",
};

const OUTCOME_OPTIONS = [
  "Stable",
  "Improved",
  "Ongoing",
  "Referred",
  "Admitted",
  "Other",
];

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

function getAllowedActions(role?: string, currentStatus?: string) {
  if (!role || !currentStatus) return [];

  const moves = MOVES_BY_STATUS[currentStatus] || [];

  if (role === "admin" || role === "doctor" || role === "staff") {
    return moves;
  }

  return [];
}

export default function ProcedureScreen() {
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

  const [procedureName, setProcedureName] = useState("");
  const [treatmentGiven, setTreatmentGiven] = useState("");
  const [emergency, setEmergency] = useState(false);
  const [procedureNotes, setProcedureNotes] = useState("");
  const [outcome, setOutcome] = useState("Stable");

  const canUseProcedureRoom =
    user?.role === "admin" ||
    user?.role === "doctor" ||
    user?.role === "staff";

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
            department: "procedures",
          },
        });

        const allVisits = Array.isArray(res.data) ? res.data : [];

        const procedureVisits = allVisits.filter((visit: Visit) =>
          PROCEDURE_STATUSES.includes(visit.status)
        );

        const sorted = [...procedureVisits].sort((a, b) => {
          const aWeight = a.status === "waiting_procedure" ? 0 : 1;
          const bWeight = b.status === "waiting_procedure" ? 0 : 1;

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
          "Failed to load procedure queue";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (status === 403) {
          setError(
            message ||
              "Only doctors, administrators, and treatment room staff can access this screen."
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
    setProcedureName("");
    setTreatmentGiven("");
    setEmergency(false);
    setProcedureNotes("");
    setOutcome("Stable");
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
    setProcedureName("");
    setTreatmentGiven("");
    setEmergency(false);
    setProcedureNotes("");
    setOutcome("Stable");
  };

  const buildProcedurePayload = (): {
    error: string | null;
    data: any[] | null | undefined;
  } => {
    if (!pendingAction) {
      return { error: null, data: undefined };
    }

    if (pendingAction.status !== "procedure_in_progress") {
      return { error: null, data: undefined };
    }

    const cleanProcedureName = procedureName.trim();

    if (!cleanProcedureName) {
      return {
        error: "Enter procedure/treatment name.",
        data: null,
      };
    }

    return {
      error: null,
      data: [
        {
          procedureName: cleanProcedureName,
          treatmentGiven: treatmentGiven.trim() || undefined,
          emergency,
          notes: procedureNotes.trim() || undefined,
          outcome: outcome.trim() || undefined,
        },
      ],
    };
  };

  const confirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    const procedureCheck = buildProcedurePayload();

    if (procedureCheck.error) {
      setError(procedureCheck.error);
      return;
    }

    const selectedVisit = visits.find(
      (visit) => visit._id === pendingAction.visitId
    );

    const leavingProcedureRoom = [
      "waiting_lab",
      "waiting_billing",
      "waiting_dispensary",
      "completed",
    ].includes(pendingAction.status);

    if (
      leavingProcedureRoom &&
      (!selectedVisit?.procedures || selectedVisit.procedures.length === 0)
    ) {
      setError(
        "Record at least one procedure/treatment before sending the patient out."
      );
      return;
    }

    const payload: any = {
      status: pendingAction.status,
      notes:
        actionNotes.trim() ||
        ACTION_NOTES[pendingAction.status] ||
        "Procedure room action",
    };

    if (procedureCheck.data) {
      payload.procedures = procedureCheck.data;
    }

    try {
      setSubmittingAction(true);
      setError(null);

      await API.patch(`/visits/${pendingAction.visitId}/move`, payload);

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
    } finally {
      setSubmittingAction(false);
    }
  };

  const waitingCount = useMemo(
    () =>
      visits.filter((visit) => visit.status === "waiting_procedure").length,
    [visits]
  );

  const inProgressCount = useMemo(
    () =>
      visits.filter((visit) => visit.status === "procedure_in_progress")
        .length,
    [visits]
  );

  if (loading) {
    return (
      <LoadingState
        title="Loading procedure queue..."
        subtitle="Please wait while patients waiting for treatment load."
      />
    );
  }

  if (!canUseProcedureRoom) {
    return (
      <ErrorState
        message="Only doctors, administrators, and treatment room staff can access this screen."
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
      <Text style={styles.title}>🩺 Procedure / Treatment Room</Text>

      <Text style={styles.subtitle}>
        Record emergency treatment, procedures, dressings, injections, and
        patient stabilization before laboratory, billing, dispensary, or
        completion.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Waiting Procedure</Text>
          <Text style={styles.summaryValue}>{waitingCount}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>In Procedure</Text>
          <Text style={styles.summaryValue}>{inProgressCount}</Text>
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

          {pendingAction.status === "procedure_in_progress" ? (
            <View style={styles.procedureSection}>
              <Text style={styles.sectionTitle}>
                Procedure / Treatment Details
              </Text>

              <Text style={styles.label}>Procedure Name *</Text>
              <TextInput
                style={styles.input}
                value={procedureName}
                onChangeText={setProcedureName}
                placeholder="e.g. Wound dressing, nebulization, catheterization"
                editable={!submittingAction}
              />

              <Text style={styles.label}>Treatment Given</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={treatmentGiven}
                onChangeText={setTreatmentGiven}
                placeholder="e.g. Tetanus toxoid, IV fluids, oxygen"
                multiline
                editable={!submittingAction}
              />

              <View style={styles.switchRow}>
                <Text style={styles.label}>Emergency?</Text>
                <Switch
                  value={emergency}
                  onValueChange={setEmergency}
                  disabled={submittingAction}
                />
              </View>

              <Text style={styles.label}>Outcome</Text>
              <View style={styles.outcomeRow}>
                {OUTCOME_OPTIONS.map((item) => {
                  const active = outcome === item;

                  return (
                    <TouchableOpacity
                      key={item}
                      onPress={() => setOutcome(item)}
                      style={[
                        styles.outcomeButton,
                        active && styles.outcomeButtonActive,
                      ]}
                      disabled={submittingAction}
                    >
                      <Text
                        style={[
                          styles.outcomeText,
                          active && styles.outcomeTextActive,
                        ]}
                      >
                        {item}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Procedure Notes</Text>
              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={procedureNotes}
                onChangeText={setProcedureNotes}
                placeholder="Enter observations, condition on arrival, or notes"
                multiline
                editable={!submittingAction}
              />
            </View>
          ) : null}

          <Text style={styles.label}>Action Note</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={actionNotes}
            onChangeText={setActionNotes}
            placeholder="Enter note for this action"
            multiline
            editable={!submittingAction}
          />

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
          title="No patients are waiting in the procedure room."
          subtitle="Doctor can send a patient here from consultation."
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

            {visit.procedures && visit.procedures.length > 0 ? (
              <>
                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>
                  Recorded Procedures / Treatments
                </Text>

                {visit.procedures.map((proc, index) => (
                  <View
                    key={`${proc.procedureName}-${index}`}
                    style={styles.procedurePreview}
                  >
                    <Text style={styles.procedurePreviewName}>
                      {proc.procedureName || "Unknown procedure"}
                    </Text>

                    {proc.treatmentGiven ? (
                      <Text style={styles.detail}>
                        Treatment: {proc.treatmentGiven}
                      </Text>
                    ) : null}

                    <Text style={styles.detail}>
                      Emergency: {proc.emergency ? "Yes" : "No"}
                    </Text>

                    {proc.outcome ? (
                      <Text style={styles.detail}>
                        Outcome: {proc.outcome}
                      </Text>
                    ) : null}

                    {proc.notes ? (
                      <Text style={styles.note}>{proc.notes}</Text>
                    ) : null}

                    {proc.performedAt ? (
                      <Text style={styles.detail}>
                        Recorded: {formatDate(proc.performedAt)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </>
            ) : null}

            <View style={styles.divider} />

            <Text style={styles.actionTitle}>
              Procedure Room Actions
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
                      actionStatus === "cancelled" && styles.dangerButton,
                      actionStatus === "procedure_in_progress" &&
                        styles.primaryActionButton,
                      actionStatus === "waiting_lab" &&
                        styles.labButton,
                      actionStatus === "waiting_billing" &&
                        styles.billingButton,
                      actionStatus === "waiting_dispensary" &&
                        styles.dispensaryButton,
                      actionStatus === "completed" &&
                        styles.successButton,
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
    borderColor: "#7c3aed",
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

  procedureSection: {
    backgroundColor: "#f5f3ff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#ddd6fe",
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
    minHeight: 90,
    textAlignVertical: "top",
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  outcomeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  outcomeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },

  outcomeButtonActive: {
    backgroundColor: "#7c3aed",
  },

  outcomeText: {
    color: "#111827",
    fontWeight: "600",
  },

  outcomeTextActive: {
    color: "#ffffff",
  },

  primaryButton: {
    backgroundColor: "#7c3aed",
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

  procedurePreview: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },

  procedurePreviewName: {
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

  primaryActionButton: {
    backgroundColor: "#7c3aed",
  },

  labButton: {
    backgroundColor: "#0891b2",
  },

  billingButton: {
    backgroundColor: "#ca8a04",
  },

  dispensaryButton: {
    backgroundColor: "#16a34a",
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
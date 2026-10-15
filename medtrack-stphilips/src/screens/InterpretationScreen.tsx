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

const INTERPRETATION_STATUS = "waiting_interpretation";

const ALLOWED_ACTIONS = [
  "waiting_billing",
  "completed",
  "cancelled",
];

const ACTION_LABELS: Record<string, string> = {
  waiting_billing: "Send to Billing",
  completed: "Complete Visit",
  cancelled: "Cancel Visit",
};

const ACTION_NOTES: Record<string, string> = {
  waiting_billing: "Results interpreted. Sent to billing.",
  completed: "Results interpreted. Visit completed.",
  cancelled: "Visit cancelled during interpretation.",
};

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

        const interpretationVisits = allVisits.filter(
          (visit: Visit) => visit.status === INTERPRETATION_STATUS
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
  };

  const confirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    const payload = {
      status: pendingAction.status,
      notes:
        actionNotes.trim() ||
        ACTION_NOTES[pendingAction.status] ||
        "Interpretation action",
    };

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

  const totalCritical = useMemo(() => {
    let count = 0;

    for (const visit of visits) {
      for (const result of visit.labResults || []) {
        if (result.status === "critical") {
          count += 1;
        }
      }
    }

    return count;
  }, [visits]);

  if (loading) {
    return (
      <LoadingState
        title="Loading interpretation queue..."
        subtitle="Please wait while lab results load for interpretation."
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
        Review laboratory results, add interpretation notes, then send the
        patient to billing or complete the visit.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Waiting Interpretation</Text>
          <Text style={styles.summaryValue}>{visits.length}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Critical Results</Text>
          <Text
            style={[
              styles.summaryValue,
              totalCritical > 0 && { color: "#b91c1c" },
            ]}
          >
            {totalCritical}
          </Text>
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
            placeholder="Enter interpretation, diagnosis impression, or next action"
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
          title="No patients are waiting for result interpretation."
          subtitle="Laboratory staff must send results here first."
        />
      ) : null}

      {visits.map((visit) => {
        const patient = visit.patient || {};

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

            <View style={styles.divider} />

            <Text style={styles.sectionLabel}>Laboratory Results</Text>

            {visit.labResults && visit.labResults.length > 0 ? (
              visit.labResults.map((result, index) => (
                <View
                  key={`${result.testName || "result"}-${index}`}
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

                  {result.performedAt ? (
                    <Text style={styles.time}>
                      Recorded: {formatDate(result.performedAt)}
                    </Text>
                  ) : null}
                </View>
              ))
            ) : (
              <Text style={styles.noActionText}>
                No lab results were recorded.
              </Text>
            )}

            <View style={styles.divider} />

            <Text style={styles.actionTitle}>
              Interpretation Actions
            </Text>

            {ALLOWED_ACTIONS.map((actionStatus) => {
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
                    actionStatus === "completed" && styles.successButton,
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
            })}
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
    minHeight: 100,
    textAlignVertical: "top",
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

  time: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 6,
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
    marginBottom: 8,
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

  billingButton: {
    backgroundColor: "#ca8a04",
  },

  successButton: {
    backgroundColor: "#16a34a",
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
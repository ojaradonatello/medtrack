import React, { useCallback, useContext, useEffect, useState } from "react";
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

const BILLING_STATUS = "waiting_billing";

const ALLOWED_ACTIONS = [
  "waiting_dispensary",
  "completed",
  "cancelled",
];

const ACTION_LABELS: Record<string, string> = {
  waiting_dispensary: "Send to Dispensary",
  completed: "Complete Visit",
  cancelled: "Cancel Visit",
};

const ACTION_NOTES: Record<string, string> = {
  waiting_dispensary: "Billing cleared, sent to dispensary",
  completed: "Billing completed and visit closed",
  cancelled: "Visit cancelled during billing",
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

export default function BillingScreen() {
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

  const canBill = user?.role === "admin" || user?.role === "billing";

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
            department: "billing",
          },
        });

        const allVisits = Array.isArray(res.data) ? res.data : [];

        const billingVisits = allVisits.filter(
          (visit: Visit) => visit.status === BILLING_STATUS
        );

        setVisits(billingVisits);
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load billing queue";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (status === 403) {
          setError(
            message ||
              "Only billing staff and administrators can access billing."
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
        "Billing action",
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

  if (loading) {
    return (
      <LoadingState
        title="Loading billing queue..."
        subtitle="Please wait while patients waiting for billing load."
      />
    );
  }

  if (!canBill) {
    return (
      <ErrorState
        message="Only billing staff and administrators can access billing."
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
      <Text style={styles.title}>💳 Billing</Text>

      <Text style={styles.subtitle}>
        Review patient charges, clear billing, then send the patient to
        dispensary or complete the visit.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>
          Patients Waiting for Billing
        </Text>
        <Text style={styles.summaryValue}>{visits.length}</Text>
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

          <Text style={styles.label}>Billing Note</Text>

          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={actionNotes}
            onChangeText={setActionNotes}
            placeholder="Enter billing note, charge summary, or clearance detail"
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
          title="No patients are waiting for billing."
          subtitle="Send a patient from interpretation or doctor consultation to billing first."
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

            <View style={styles.divider} />

            <Text style={styles.actionTitle}>
              Billing Actions
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

  summaryCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
  },

  summaryValue: {
    fontSize: 28,
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

  sectionLabel: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#111827",
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },

  actionButton: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8,
  },

  dangerButton: {
    backgroundColor: "#dc2626",
  },

  successButton: {
    backgroundColor: "#16a34a",
  },

  disabledButton: {
    opacity: 0.6,
  },

  actionButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
});
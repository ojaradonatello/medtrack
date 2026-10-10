import React, { useEffect, useState, useCallback, useContext } from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  TextInput,
  Platform,
  Alert,
  KeyboardAvoidingView,
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

const ACTIVE_STATUSES = [
  "registered",
  "waiting_consultation",
  "in_consultation",
  "waiting_lab",
  "lab_in_progress",
  "waiting_interpretation",
  "waiting_billing",
  "waiting_dispensary",
];

const ALLOWED_MOVES = {
  registered: ["waiting_consultation", "cancelled", "no_show"],

  waiting_consultation: [
    "in_consultation",
    "waiting_lab",
    "cancelled",
    "no_show",
  ],

  in_consultation: [
    "waiting_lab",
    "waiting_billing",
    "waiting_dispensary",
    "completed",
    "cancelled",
  ],

  waiting_lab: ["lab_in_progress", "waiting_billing", "cancelled"],

  lab_in_progress: [
    "waiting_interpretation",
    "waiting_billing",
    "cancelled",
  ],

  waiting_interpretation: ["waiting_billing", "completed", "cancelled"],

  waiting_billing: ["waiting_dispensary", "completed", "cancelled"],

  waiting_dispensary: ["completed", "cancelled"],

  completed: [],
  cancelled: [],
  no_show: [],
};

const ROLE_ALLOWED_TARGET_STATUSES = {
  admin: null,

  reception: [
    "registered",
    "waiting_consultation",
    "cancelled",
    "no_show",
  ],

  doctor: [
    "in_consultation",
    "waiting_lab",
    "waiting_billing",
    "waiting_dispensary",
    "completed",
    "cancelled",
  ],

  lab: [
    "lab_in_progress",
    "waiting_interpretation",
    "waiting_billing",
    "cancelled",
  ],

  billing: ["waiting_dispensary", "completed", "cancelled"],

  pharmacist: ["completed", "cancelled"],
};

const DEPARTMENTS = [
  "consultation",
  "laboratory",
  "interpretation",
  "billing",
  "dispensary",
];

const ACTION_LABELS = {
  in_consultation: "Start Consultation",
  waiting_lab: "Send to Laboratory",
  lab_in_progress: "Start Lab Test",
  waiting_interpretation: "Send to Interpretation",
  waiting_billing: "Send to Billing",
  waiting_dispensary: "Send to Dispensary",
  completed: "Complete Visit",
  cancelled: "Cancel Visit",
  no_show: "Mark No Show",
  registered: "Mark Registered",
  waiting_consultation: "Send to Consultation",
};

const ACTION_NOTES = {
  in_consultation: "Doctor started consultation",
  waiting_lab: "Doctor sent patient to laboratory",
  lab_in_progress: "Laboratory started test",
  waiting_interpretation: "Laboratory sent results for interpretation",
  waiting_billing: "Interpretation completed, sent to billing",
  waiting_dispensary: "Billing cleared, sent to dispensary",
  completed: "Visit completed",
  cancelled: "Visit cancelled",
  no_show: "Patient did not attend",
  registered: "Patient registered",
  waiting_consultation: "Patient waiting for consultation",
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

function defaultDepartmentForRole(role?: string) {
  switch (role) {
    case "doctor":
      return "consultation";
    case "lab":
      return "laboratory";
    case "billing":
      return "billing";
    case "pharmacist":
      return "dispensary";
    case "reception":
      return "consultation";
    default:
      return "consultation";
  }
}

function getAllowedActions(role?: string, currentStatus?: string) {
  if (!role || !currentStatus) return [];

  const moves = ALLOWED_MOVES[currentStatus as keyof typeof ALLOWED_MOVES] || [];

  if (role === "admin") {
    return moves;
  }

  const allowedTargets =
    ROLE_ALLOWED_TARGET_STATUSES[
      role as keyof typeof ROLE_ALLOWED_TARGET_STATUSES
    ];

  if (!allowedTargets) {
    return [];
  }

  return moves.filter((status) => allowedTargets.includes(status));
}

function toNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const num = Number(trimmed);

  if (Number.isNaN(num)) {
    return null;
  }

  return num;
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

type PendingAction = {
  visitId: string;
  status: string;
  label: string;
  patientName: string;
};

export default function WorklistScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [department, setDepartment] = useState(
    defaultDepartmentForRole(user?.role)
  );

  const [visits, setVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [pendingAction, setPendingAction] = useState<PendingAction | null>(
    null
  );
  const [actionNotes, setActionNotes] = useState("");
  const [submittingAction, setSubmittingAction] = useState(false);

  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [temperature, setTemperature] = useState("");
  const [pulse, setPulse] = useState("");
  const [weight, setWeight] = useState("");

  const loadWorklist = useCallback(
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
            department,
          },
        });

        const allVisits = Array.isArray(res.data) ? res.data : [];

        const activeVisits = allVisits.filter((visit: any) =>
          ACTIVE_STATUSES.includes(visit.status)
        );

        setVisits(activeVisits);
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load worklist";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        setError(message);
        setVisits([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [department, logout, router, user]
  );

  useEffect(() => {
    loadWorklist(false);
  }, [loadWorklist]);

  const resetVitalsForm = () => {
    setSystolic("");
    setDiastolic("");
    setTemperature("");
    setPulse("");
    setWeight("");
    setActionNotes("");
    setPendingAction(null);
  };

  const openAction = (visit: any, status: string) => {
    const label =
      ACTION_LABELS[status as keyof typeof ACTION_LABELS] || humanize(status);

    setPendingAction({
      visitId: visit._id,
      status,
      label,
      patientName: visit.patient?.name || "Unknown Patient",
    });

    setActionNotes(
      ACTION_NOTES[status as keyof typeof ACTION_NOTES] ||
        `${user?.role || "User"} moved visit`
    );

    setSystolic(
      visit.vitals?.bloodPressure?.systolic !== undefined
        ? String(visit.vitals.bloodPressure.systolic)
        : ""
    );

    setDiastolic(
      visit.vitals?.bloodPressure?.diastolic !== undefined
        ? String(visit.vitals.bloodPressure.diastolic)
        : ""
    );

    setTemperature(
      visit.vitals?.temperatureC !== undefined
        ? String(visit.vitals.temperatureC)
        : ""
    );

    setPulse(
      visit.vitals?.pulseBpm !== undefined
        ? String(visit.vitals.pulseBpm)
        : ""
    );

    setWeight(
      visit.vitals?.weightKg !== undefined
        ? String(visit.vitals.weightKg)
        : ""
    );
  };

  const buildVitalsPayload = () => {
    const vitals: any = {};

    const sys = toNumber(systolic);
    const dia = toNumber(diastolic);
    const temp = toNumber(temperature);
    const pul = toNumber(pulse);
    const wt = toNumber(weight);

    if (
      sys === null ||
      dia === null ||
      temp === null ||
      pul === null ||
      wt === null
    ) {
      return {
        error: "Vitals values must be numbers",
        vitals: null,
      };
    }

    if (
      (sys !== undefined || dia !== undefined) &&
      (sys === undefined || dia === undefined)
    ) {
      return {
        error: "Provide both systolic and diastolic blood pressure",
        vitals: null,
      };
    }

    if (sys !== undefined && dia !== undefined) {
      if (sys < 0 || sys > 300) {
        return {
          error: "Systolic blood pressure seems invalid",
          vitals: null,
        };
      }

      if (dia < 0 || dia > 200) {
        return {
          error: "Diastolic blood pressure seems invalid",
          vitals: null,
        };
      }

      vitals.bloodPressure = {
        systolic: sys,
        diastolic: dia,
      };
    }

    if (temp !== undefined) {
      if (temp < -50 || temp > 100) {
        return {
          error: "Temperature seems invalid",
          vitals: null,
        };
      }

      vitals.temperatureC = temp;
    }

    if (pul !== undefined) {
      if (pul < 0 || pul > 300) {
        return {
          error: "Pulse seems invalid",
          vitals: null,
        };
      }

      vitals.pulseBpm = pul;
    }

    if (wt !== undefined) {
      if (wt < 0 || wt > 500) {
        return {
          error: "Weight seems invalid",
          vitals: null,
        };
      }

      vitals.weightKg = wt;
    }

    if (Object.keys(vitals).length === 0) {
      return {
        error: null,
        vitals: null,
      };
    }

    return {
      error: null,
      vitals,
    };
  };

  const confirmAction = async () => {
    if (!pendingAction) {
      return;
    }

    const vitalsResult = buildVitalsPayload();

    if (vitalsResult.error) {
      showMessage("Invalid vitals", vitalsResult.error);
      return;
    }

    const payload: any = {
      status: pendingAction.status,
      notes: actionNotes.trim() || undefined,
    };

    if (vitalsResult.vitals) {
      payload.vitals = vitalsResult.vitals;
    }

    try {
      setSubmittingAction(true);

      await API.patch(`/visits/${pendingAction.visitId}/move`, payload);

      showMessage("Success", `${pendingAction.label} completed.`);

      resetVitalsForm();
      await loadWorklist(true);
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

      showMessage("Action failed", message);
    } finally {
      setSubmittingAction(false);
    }
  };

  if (loading) {
    return (
      <LoadingState
        title="Loading worklist..."
        subtitle="Please wait while department patients load."
      />
    );
  }

  if (error && visits.length === 0) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadWorklist(false)}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.screen}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadWorklist(true)}
          />
        }
      >
        <Text style={styles.title}>🩺 Department Worklist</Text>

        <Text style={styles.subtitle}>
          Logged in as: {user?.name || "User"} | Role:{" "}
          {user?.role || "unknown"}
        </Text>

        <View style={styles.filterRow}>
          {DEPARTMENTS.map((dep) => {
            const active = department === dep;

            return (
              <TouchableOpacity
                key={dep}
                onPress={() => setDepartment(dep)}
                style={[
                  styles.filterButton,
                  active && styles.filterButtonActive,
                ]}
              >
                <Text
                  style={[
                    styles.filterText,
                    active && styles.filterTextActive,
                  ]}
                >
                  {humanize(dep)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {pendingAction ? (
          <View style={styles.actionPanel}>
            <Text style={styles.actionPanelTitle}>
              {pendingAction.label}
            </Text>

            <Text style={styles.actionPanelSubtitle}>
              Patient: {pendingAction.patientName}
            </Text>

            <Text style={styles.label}>Notes</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              value={actionNotes}
              onChangeText={setActionNotes}
              placeholder="Optional notes"
              multiline
            />

            <Text style={styles.sectionTitle}>Vitals (optional)</Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <Text style={styles.label}>Systolic</Text>
                <TextInput
                  style={styles.input}
                  value={systolic}
                  onChangeText={setSystolic}
                  keyboardType="numeric"
                  placeholder="120"
                />
              </View>

              <View style={styles.halfField}>
                <Text style={styles.label}>Diastolic</Text>
                <TextInput
                  style={styles.input}
                  value={diastolic}
                  onChangeText={setDiastolic}
                  keyboardType="numeric"
                  placeholder="80"
                />
              </View>
            </View>

            <Text style={styles.label}>Temperature °C</Text>
            <TextInput
              style={styles.input}
              value={temperature}
              onChangeText={setTemperature}
              keyboardType="numeric"
              placeholder="36.8"
            />

            <Text style={styles.label}>Pulse bpm</Text>
            <TextInput
              style={styles.input}
              value={pulse}
              onChangeText={setPulse}
              keyboardType="numeric"
              placeholder="78"
            />

            <Text style={styles.label}>Weight kg</Text>
            <TextInput
              style={styles.input}
              value={weight}
              onChangeText={setWeight}
              keyboardType="numeric"
              placeholder="70"
            />

            <TouchableOpacity
              style={styles.primaryButton}
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
              onPress={resetVitalsForm}
              disabled={submittingAction}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <ErrorBanner message={error} />

        {!error && visits.length === 0 ? (
          <EmptyState
            title={`No active patients in ${humanize(department)}.`}
            subtitle="Pull down to refresh or change department."
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
                <Text style={styles.note}>Note: {visit.notes}</Text>
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

              {actions.length === 0 ? (
                <Text style={styles.noActionText}>
                  No actions available for your role.
                </Text>
              ) : (
                actions.map((actionStatus) => {
                  const label =
                    ACTION_LABELS[
                      actionStatus as keyof typeof ACTION_LABELS
                    ] || humanize(actionStatus);

                  return (
                    <TouchableOpacity
                      key={actionStatus}
                      disabled={submittingAction}
                      onPress={() => openAction(visit, actionStatus)}
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
                })
              )}
            </View>
          );
        })}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = {
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
    marginBottom: 16,
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },

  filterButtonActive: {
    backgroundColor: "#2563eb",
  },

  filterText: {
    color: "#111827",
    fontWeight: "600",
  },

  filterTextActive: {
    color: "#ffffff",
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

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 8,
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
    minHeight: 80,
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
};
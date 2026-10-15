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

  visitSummary?: {
    diagnosis?: string;
    treatmentGiven?: string;
    advice?: string;
    dischargeStatus?: string;
    summaryNote?: string;
    followUpDate?: string;
    createdBy?: string;
    createdAt?: string;
  } | null;
};
type PendingAction = {
  visitId: string;
  status: string;
  label: string;
  patientName: string;
};

const DISCHARGE_STATUSES = [
  { value: "improved", label: "Improved" },
  { value: "stable", label: "Stable" },
  { value: "referred", label: "Referred" },
  { value: "admitted", label: "Admitted" },
  { value: "discharged", label: "Discharged" },
  { value: "other", label: "Other" },
];

const CONSULTATION_STATUSES = [
  "waiting_consultation",
  "in_consultation",
];

const DOCTOR_ALLOWED_TARGETS = [
  "in_consultation",
  "waiting_lab",
  "waiting_billing",
  "waiting_dispensary",
  "completed",
  "cancelled",
];

const MOVES_BY_STATUS: Record<string, string[]> = {
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
};

const ACTION_LABELS: Record<string, string> = {
  in_consultation: "Start Consultation",
  waiting_lab: "Send to Laboratory",
  waiting_billing: "Send to Billing",
  waiting_dispensary: "Send to Dispensary",
  completed: "Complete Visit",
  cancelled: "Cancel Visit",
  no_show: "Mark No Show",
};

const ACTION_NOTES: Record<string, string> = {
  in_consultation: "Doctor started consultation",
  waiting_lab: "Doctor sent patient to laboratory",
  waiting_billing: "Doctor sent patient to billing",
  waiting_dispensary: "Doctor sent patient to dispensary",
  completed: "Consultation completed and visit closed",
  cancelled: "Visit cancelled during consultation",
  no_show: "Patient did not attend consultation",
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

function getActionButtonColor(status: string) {
  switch (status) {
    case "in_consultation":
      return "#7c3aed";
    case "waiting_lab":
      return "#0891b2";
    case "waiting_billing":
      return "#ca8a04";
    case "waiting_dispensary":
      return "#16a34a";
    case "completed":
      return "#15803d";
    case "cancelled":
      return "#dc2626";
    case "no_show":
      return "#6b7280";
    default:
      return "#2563eb";
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

function getAllowedActions(role?: string, currentStatus?: string) {
  if (!role || !currentStatus) return [];

  const moves = MOVES_BY_STATUS[currentStatus] || [];

  if (role === "admin") {
    return moves;
  }

  if (role === "doctor") {
    return moves.filter((status) =>
      DOCTOR_ALLOWED_TARGETS.includes(status)
    );
  }

  return [];
}

export default function ConsultationScreen() {
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

  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [temperature, setTemperature] = useState("");
  const [pulse, setPulse] = useState("");
  const [weight, setWeight] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [treatmentGiven, setTreatmentGiven] = useState("");
  const [advice, setAdvice] = useState("");
  const [dischargeStatus, setDischargeStatus] = useState("improved");
  

  const canConsult =
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
            department: "consultation",
          },
        });

        const allVisits = Array.isArray(res.data) ? res.data : [];

        const consultationVisits = allVisits.filter((visit: Visit) =>
          CONSULTATION_STATUSES.includes(visit.status)
        );

        const sorted = [...consultationVisits].sort((a, b) => {
          const aWeight = a.status === "waiting_consultation" ? 0 : 1;
          const bWeight = b.status === "waiting_consultation" ? 0 : 1;

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
          "Failed to load consultation queue";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (status === 403) {
          setError(
            message ||
              "Only doctors and administrators can access consultation."
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
  setSystolic("");
  setDiastolic("");
  setTemperature("");
  setPulse("");
  setWeight("");
  setDiagnosis("");
  setTreatmentGiven("");
  setAdvice("");
  setDischargeStatus("improved");
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

    setDiagnosis("");
setTreatmentGiven("");
setAdvice("");
setDischargeStatus("improved");
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

    if (pendingAction.status === "completed" && !diagnosis.trim()) {
  showMessage(
    "Summary required",
    "Enter diagnosis before completing the visit."
  );
  return;
}

    const vitalsResult = buildVitalsPayload();

    if (vitalsResult.error) {
      showMessage("Invalid vitals", vitalsResult.error);
      return;
    }

    const payload: any = {
      status: pendingAction.status,
      notes:
        actionNotes.trim() ||
        ACTION_NOTES[pendingAction.status] ||
        "Consultation action",
    };

   if (vitalsResult.vitals) {
  payload.vitals = vitalsResult.vitals;
}

if (pendingAction.status === "completed") {
  payload.visitSummary = {
    diagnosis: diagnosis.trim(),
    treatmentGiven: treatmentGiven.trim() || undefined,
    advice: advice.trim() || undefined,
    dischargeStatus,
    summaryNote: actionNotes.trim() || undefined,
  };
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
    () =>
      visits.filter((visit) => visit.status === "waiting_consultation")
        .length,
    [visits]
  );

  const inProgressCount = useMemo(
    () =>
      visits.filter((visit) => visit.status === "in_consultation").length,
    [visits]
  );

  if (loading) {
    return (
      <LoadingState
        title="Loading consultation queue..."
        subtitle="Please wait while patients waiting for doctor load."
      />
    );
  }

  if (!canConsult) {
    return (
      <ErrorState
        message="Only doctors and administrators can access consultation."
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
      <Text style={styles.title}>👨‍⚕️ Consultation</Text>

      <Text style={styles.subtitle}>
        Review patients waiting for doctor consultation, update vitals, and
        route patients to laboratory, billing, dispensary, or completion.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Waiting Consultation</Text>
          <Text style={styles.summaryValue}>{waitingCount}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>In Consultation</Text>
          <Text style={styles.summaryValue}>{inProgressCount}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Consultation Queue</Text>
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

          <Text style={styles.label}>Consultation Note</Text>

          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={actionNotes}
            onChangeText={setActionNotes}
            placeholder="Enter diagnosis, consultation note, or next action"
            multiline
            editable={!submittingAction}
          />
       
          {pendingAction.status === "completed" ? (
  <View style={styles.summarySection}>
    <Text style={styles.sectionTitle}>
      Visit Summary / Discharge Note
    </Text>

    <Text style={styles.label}>Diagnosis *</Text>
    <TextInput
      style={[styles.input, styles.multilineInput]}
      value={diagnosis}
      onChangeText={setDiagnosis}
      placeholder="Enter main diagnosis"
      multiline
      editable={!submittingAction}
    />

    <Text style={styles.label}>Treatment Given</Text>
    <TextInput
      style={[styles.input, styles.multilineInput]}
      value={treatmentGiven}
      onChangeText={setTreatmentGiven}
      placeholder="Enter treatment given, medication, procedure, or plan"
      multiline
      editable={!submittingAction}
    />

    <Text style={styles.label}>Advice / Follow-up</Text>
    <TextInput
      style={[styles.input, styles.multilineInput]}
      value={advice}
      onChangeText={setAdvice}
      placeholder="Enter patient advice, return date, warning signs, or follow-up plan"
      multiline
      editable={!submittingAction}
    />

    <Text style={styles.label}>Discharge Status</Text>

    <View style={styles.statusRow}>
      {DISCHARGE_STATUSES.map((item) => {
        const active = dischargeStatus === item.value;

        return (
          <TouchableOpacity
            key={item.value}
            onPress={() => setDischargeStatus(item.value)}
            style={[
              styles.statusButton,
              active && styles.statusButtonActive,
            ]}
            disabled={submittingAction}
          >
            <Text
              style={[
                styles.statusText,
                active && styles.statusTextActive,
              ]}
            >
              {item.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
) : null}

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
                editable={!submittingAction}
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
                editable={!submittingAction}
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
            editable={!submittingAction}
          />

          <Text style={styles.label}>Pulse bpm</Text>
          <TextInput
            style={styles.input}
            value={pulse}
            onChangeText={setPulse}
            keyboardType="numeric"
            placeholder="78"
            editable={!submittingAction}
          />

          <Text style={styles.label}>Weight kg</Text>
          <TextInput
            style={styles.input}
            value={weight}
            onChangeText={setWeight}
            keyboardType="numeric"
            placeholder="70"
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
          title="No patients are currently waiting for consultation."
          subtitle="Register a patient from reception first."
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

            <Text style={[styles.detail, { color: "#b91c1c", fontWeight: "bold" }]}>
              🚨 Next of Kin: {patient.nextOfKinName || "—"} ({patient.nextOfKinPhone || "No phone"})
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
              Consultation Actions
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
                      {
                        backgroundColor:
                          getActionButtonColor(actionStatus),
                      },
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
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 8,
  },

  disabledButton: {
    opacity: 0.6,
  },

actionButtonText: {
  color: "#ffffff",
  fontWeight: "bold",
},

summarySection: {
  backgroundColor: "#f9fafb",
  padding: 12,
  borderRadius: 10,
  borderWidth: 1,
  borderColor: "#e5e7eb",
  marginBottom: 12,
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

statusText: {
  color: "#111827",
  fontWeight: "600",
},

statusTextActive: {
  color: "#ffffff",
},
});
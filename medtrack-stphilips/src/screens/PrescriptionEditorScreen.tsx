import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
  StyleSheet,
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

import {
  LoadingState,
  ErrorState,
  ErrorBanner,
  SuccessBanner,
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
  completedAt?: string;
  patient?: Patient;
  prescriptions?: Prescription[];
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

const TERMINAL_STATUSES = ["completed", "cancelled", "no_show"];

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

export default function PrescriptionEditorScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, logout } = useContext(AuthContext);

  const rawVisitId = Array.isArray(params.visitId)
    ? params.visitId[0]
    : params.visitId;

  const visitId = rawVisitId;

  const [visit, setVisit] = useState<Visit | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [prescriptions, setPrescriptions] = useState<PrescriptionInput[]>([
    makeEmptyPrescription(),
  ]);

  const allowed = user?.role === "admin" || user?.role === "doctor";

  const loadVisit = useCallback(
    async (isRefresh = false) => {
      if (!visitId) {
        setError("No visit ID provided.");
        setLoading(false);
        return;
      }

      if (!isRefresh) {
        setLoading(true);
      }

      setError(null);

      try {
        const res = await API.get(`/visits/${visitId}`);
        const data = res.data as Visit;

        setVisit(data);

        const existing = Array.isArray(data.prescriptions)
          ? data.prescriptions
          : [];

        if (existing.length === 0) {
          setPrescriptions([makeEmptyPrescription()]);
        } else {
          setPrescriptions(
            existing.map((rx, index) => ({
              id: `${rx.drugName || "rx"}-${index}-${
                rx.prescribedAt || Date.now()
              }`,
              drugName: rx.drugName || "",
              strength: rx.strength || "",
              quantity:
                rx.quantity !== undefined && rx.quantity !== null
                  ? String(rx.quantity)
                  : "",
              dosage: rx.dosage || "",
              frequency: rx.frequency || "",
              duration: rx.duration || "",
              instructions: rx.instructions || "",
            }))
          );
        }
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load visit";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        setError(message);
      } finally {
        setLoading(false);
      }
    },
    [logout, router, visitId]
  );

  useEffect(() => {
    loadVisit(false);
  }, [loadVisit]);

  const hasDispensed =
    Array.isArray(visit?.prescriptions) &&
    visit.prescriptions.some(
      (rx) =>
        rx.dispensed === true || Number(rx.dispensedQuantity || 0) > 0
    );

  const isTerminal = TERMINAL_STATUSES.includes(visit?.status || "");

  const canEdit = allowed && !!visit && !isTerminal && !hasDispensed;

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

  const buildPayload = (): {
    error: string | null;
    data: any[] | null;
  } => {
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
        error: "Add at least one prescription before saving.",
        data: null,
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

  const savePrescriptions = async () => {
    if (!canEdit) {
      setError("You cannot edit prescriptions for this visit.");
      return;
    }

    const result = buildPayload();

    if (result.error) {
      setError(result.error);
      return;
    }

    if (!result.data) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await API.patch(`/visits/${visitId}/move`, {
        prescriptions: result.data,
      });

      setSuccess("Prescription updated successfully.");
      await loadVisit(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to update prescription";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LoadingState
        title="Loading prescription..."
        subtitle="Please wait while the visit prescription loads."
      />
    );
  }

  if (!allowed) {
    return (
      <ErrorState
        message="Only doctors and administrators can edit prescriptions."
        onRetry={() => router.back()}
      />
    );
  }

  if (error && !visit) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadVisit(false)}
      />
    );
  }

  const patient = visit?.patient || {};

  return (
    <ScrollView style={styles.screen}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>✍️ Edit Prescription</Text>

      <Text style={styles.subtitle}>
        Doctor can add or correct prescribed medicines while the patient stays
        in the current department. This does not move the patient backward.
      </Text>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Patient</Text>

        <Text style={styles.detail}>
          Name: {patient.name || "—"}
        </Text>

        <Text style={styles.detail}>
          Phone: {patient.phone || "—"}
        </Text>

        <Text style={styles.detail}>
          Age: {patient.age ?? "—"}
        </Text>

        <Text style={styles.detail}>
          Gender: {patient.gender || "—"}
        </Text>

        <Text style={styles.detail}>
          Tribe: {patient.tribe || "—"}
        </Text>

        <Text style={styles.detail}>
          Next of Kin: {patient.nextOfKinName || "—"} (
          {patient.nextOfKinPhone || "No phone"})
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Visit</Text>

        <Text style={styles.detail}>
          Visit Number: {visit?.visitNumber || "—"}
        </Text>

        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(visit?.status || "") },
          ]}
        >
          <Text style={styles.statusText}>
            {humanize(visit?.status)}
          </Text>
        </View>

        <Text style={styles.detail}>
          Department: {humanize(visit?.currentDepartment)}
        </Text>

        <Text style={styles.detail}>
          Registered: {formatDate(visit?.createdAt)}
        </Text>
      </View>

      {isTerminal ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>
            Visit is closed
          </Text>

          <Text style={styles.warningText}>
            Prescriptions cannot be edited after the visit is completed,
            cancelled, or marked no show.
          </Text>
        </View>
      ) : null}

      {hasDispensed ? (
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>
            Dispensing has started
          </Text>

          <Text style={styles.warningText}>
            Prescriptions cannot be edited after the pharmacist has dispensed
            any medicine.
          </Text>
        </View>
      ) : null}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>
          Prescriptions
        </Text>

        <Text style={styles.infoText}>
          Add one medicine per block. Drug name and quantity are required.
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
                  disabled={saving || !canEdit}
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
              editable={canEdit && !saving}
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
                  editable={canEdit && !saving}
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
                  editable={canEdit && !saving}
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
                  editable={canEdit && !saving}
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
                  editable={canEdit && !saving}
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
              editable={canEdit && !saving}
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
              editable={canEdit && !saving}
            />
          </View>
        ))}

        <TouchableOpacity
          style={styles.addButton}
          onPress={addPrescription}
          disabled={saving || !canEdit}
        >
          <Text style={styles.addButtonText}>
            + Add Another Medicine
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[
          styles.saveButton,
          (!canEdit || saving) && styles.disabledButton,
        ]}
        onPress={savePrescriptions}
        disabled={!canEdit || saving}
      >
        {saving ? (
          <View style={styles.buttonContent}>
            <ActivityIndicator color="#fff" />
            <Text style={styles.saveButtonText}>Saving...</Text>
          </View>
        ) : (
          <Text style={styles.saveButtonText}>
            Save Prescription
          </Text>
        )}
      </TouchableOpacity>

      <Text style={styles.helperText}>
        After saving, the patient remains in the same department. Billing can
        then send the patient to dispensary if payment is cleared.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f9fafb",
  },

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },

  backButtonText: {
    color: "#111827",
    fontWeight: "600",
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

  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },

  warningCard: {
    backgroundColor: "#fef2f2",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 12,
  },

  warningTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#b91c1c",
    marginBottom: 6,
  },

  warningText: {
    fontSize: 14,
    color: "#7f1d1d",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
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

  infoText: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },

  prescriptionRow: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
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

  saveButton: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },

  saveButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  helperText: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 20,
  },
});
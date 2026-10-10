import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";

import { useRouter } from "expo-router";

import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

import {
  LoadingState,
  ErrorState,
  ErrorBanner,
  SuccessBanner,
  EmptyState,
} from "../components/StateView";

type Patient = {
  _id: string;
  name?: string;
  phone?: string;
  gender?: string;
  age?: number;
  address?: string;
};

type QueueVisit = {
  _id: string;
  visitNumber?: string;
  status: string;
  currentDepartment: string;
  notes?: string;
  createdAt?: string;
  patient?: Patient;
};

type Drug = {
  _id: string;
  name?: string;
  category?: string;
  quantity?: number;
  minStockLevel?: number;
  expiryDate?: string;
};

type InventoryItem = {
  _id: string;
  quantity?: number;
  minStockLevel?: number;
  expiryDate?: string;
  batchNumber?: string;
  drug?: {
    _id?: string;
    name?: string;
  } | null;
};

function formatDate(value?: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function DispenseScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [queue, setQueue] = useState<QueueVisit[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [selectedDrugId, setSelectedDrugId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!user) {
        setLoading(false);
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
        const [queueRes, drugsRes, inventoryRes] = await Promise.all([
          API.get("/dispense/queue"),
          API.get("/drugs"),
          API.get("/inventory"),
        ]);

        setQueue(Array.isArray(queueRes.data?.queue) ? queueRes.data.queue : []);
        setDrugs(Array.isArray(drugsRes.data) ? drugsRes.data : []);
        setInventory(Array.isArray(inventoryRes.data) ? inventoryRes.data : []);
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load dispensing data";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (status === 403) {
          setError(
            message ||
              "You do not have permission to dispense medication."
          );
          setQueue([]);
          setDrugs([]);
          setInventory([]);
          return;
        }

        setError(message);
        setQueue([]);
        setDrugs([]);
        setInventory([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [logout, router, user]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const stockByDrug = useMemo(() => {
    const map: Record<string, number> = {};

    for (const item of inventory) {
      const drugId = item.drug?._id;

      if (!drugId) {
        continue;
      }

      map[drugId] = (map[drugId] || 0) + Number(item.quantity || 0);
    }

    return map;
  }, [inventory]);

  const selectedVisit = queue.find((visit) => visit._id === selectedVisitId) || null;
  const selectedDrug = drugs.find((drug) => drug._id === selectedDrugId) || null;

  const availableStock = selectedDrug
    ? stockByDrug[selectedDrug._id] ?? Number(selectedDrug.quantity || 0)
    : 0;

  const validateInputs = () => {
    setError(null);
    setSuccess(null);

    if (!selectedVisit) {
      setError("Select a patient from the dispensary queue.");
      return false;
    }

    if (!selectedVisit.patient?._id) {
      setError("Selected visit has no patient ID.");
      return false;
    }

    if (!selectedDrug) {
      setError("Select a drug.");
      return false;
    }

    const parsedQuantity = Number(quantity);

    if (!quantity.trim() || Number.isNaN(parsedQuantity) || parsedQuantity <= 0) {
      setError("Enter a valid quantity greater than zero.");
      return false;
    }

    if (!Number.isInteger(parsedQuantity)) {
      setError("Quantity must be a whole number.");
      return false;
    }

    if (parsedQuantity > availableStock) {
      setError(
        `Requested quantity is ${parsedQuantity}, but available stock is ${availableStock}.`
      );
      return false;
    }

    return true;
  };

  const dispenseOnly = async () => {
    if (!validateInputs() || !selectedVisit || !selectedDrug) {
      return;
    }

    const parsedQuantity = Number(quantity);

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const res = await API.post("/dispense", {
        patient: selectedVisit.patient._id,
        drug: selectedDrug._id,
        quantity: parsedQuantity,
      });

      const alerts = Array.isArray(res.data?.alerts) ? res.data.alerts : [];

      const baseMessage = `Dispensed ${parsedQuantity} × ${
        selectedDrug.name || "drug"
      } for ${selectedVisit.patient?.name || "patient"}.`;

      if (alerts.length > 0) {
        setSuccess(`${baseMessage}\n\nWarnings:\n- ${alerts.join("\n- ")}`);
      } else {
        setSuccess(baseMessage);
      }

      setQuantity("");
      await loadData(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Dispense failed";

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

  const dispenseAndCompleteVisit = async () => {
    if (!validateInputs() || !selectedVisit || !selectedDrug) {
      return;
    }

    const parsedQuantity = Number(quantity);

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const dispenseRes = await API.post("/dispense", {
        patient: selectedVisit.patient._id,
        drug: selectedDrug._id,
        quantity: parsedQuantity,
      });

      const alerts = Array.isArray(dispenseRes.data?.alerts)
        ? dispenseRes.data.alerts
        : [];

      await API.patch(`/visits/${selectedVisit._id}/move`, {
        status: "completed",
        notes: `Medication dispensed and visit completed by ${
          user?.role || "pharmacist"
        }`,
      });

      const baseMessage = `Dispensed ${parsedQuantity} × ${
        selectedDrug.name || "drug"
      } for ${selectedVisit.patient?.name || "patient"}. Visit completed.`;

      if (alerts.length > 0) {
        setSuccess(`${baseMessage}\n\nWarnings:\n- ${alerts.join("\n- ")}`);
      } else {
        setSuccess(baseMessage);
      }

      setSelectedVisitId(null);
      setSelectedDrugId(null);
      setQuantity("");

      await loadData(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Dispense and complete failed";

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
        title="Loading dispensing data..."
        subtitle="Please wait while patients, drugs, and stock load."
      />
    );
  }

  if (error && queue.length === 0 && drugs.length === 0) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadData(false)}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadData(true)}
        />
      }
    >
      <Text style={styles.title}>💊 Dispense Medication</Text>

      <Text style={styles.subtitle}>
        Select a patient waiting in dispensary, choose a drug, dispense stock,
        and complete the visit.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>
          1. Patients Waiting in Dispensary
        </Text>
      </View>

      {queue.length === 0 ? (
        <EmptyState
          title="No patients are currently waiting in dispensary."
          subtitle="Move a patient to dispensary from billing or doctor workflow."
        />
      ) : (
        queue.map((visit) => {
          const patient = visit.patient || {};
          const active = selectedVisitId === visit._id;

          return (
            <TouchableOpacity
              key={visit._id}
              onPress={() => setSelectedVisitId(visit._id)}
              style={[styles.selectCard, active && styles.selectCardActive]}
              disabled={saving}
            >
              <Text style={styles.selectTitle}>
                {patient.name || "Unknown Patient"}
              </Text>

              <Text style={styles.detail}>
                Phone: {patient.phone || "—"}
              </Text>

              <Text style={styles.detail}>
                Visit: {visit.visitNumber || "—"}
              </Text>

              <Text style={styles.detail}>
                Status: waiting dispensary
              </Text>

              <Text style={styles.detail}>
                Registered: {formatDate(visit.createdAt)}
              </Text>

              {visit.notes ? (
                <Text style={styles.note}>
                  Note: {visit.notes}
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })
      )}

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>2. Available Drugs</Text>
      </View>

      {drugs.length === 0 ? (
        <EmptyState
          title="No drugs found."
          subtitle="Ask an administrator to create drugs and add stock first."
        />
      ) : (
        drugs.map((drug) => {
          const stock = stockByDrug[drug._id] ?? Number(drug.quantity || 0);
          const active = selectedDrugId === drug._id;
          const outOfStock = stock <= 0;

          return (
            <TouchableOpacity
              key={drug._id}
              onPress={() => setSelectedDrugId(drug._id)}
              style={[
                styles.selectCard,
                active && styles.selectCardActive,
                outOfStock && styles.outOfStockCard,
              ]}
              disabled={saving}
            >
              <Text style={styles.selectTitle}>
                {drug.name || "Unknown Drug"}
              </Text>

              <Text style={styles.detail}>
                Category: {drug.category || "—"}
              </Text>

              <Text style={styles.detail}>
                Stock: {stock}
              </Text>

              {outOfStock ? (
                <Text style={styles.outOfStockText}>
                  Out of stock
                </Text>
              ) : null}
            </TouchableOpacity>
          );
        })
      )}

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>3. Dispense Quantity</Text>
      </View>

      <View style={styles.formCard}>
        <Text style={styles.label}>Quantity</Text>

        <TextInput
          style={styles.input}
          value={quantity}
          onChangeText={setQuantity}
          placeholder="Enter quantity"
          keyboardType="numeric"
          editable={!saving}
        />

        {selectedDrug ? (
          <Text style={styles.helperText}>
            Selected drug: {selectedDrug.name || "Unknown Drug"}  
            Available stock: {availableStock}
          </Text>
        ) : (
          <Text style={styles.helperText}>
            Select a drug above.
          </Text>
        )}

        {selectedVisit ? (
          <Text style={styles.helperText}>
            Selected patient: {selectedVisit.patient?.name || "Unknown Patient"}
          </Text>
        ) : (
          <Text style={styles.helperText}>
            Select a patient above.
          </Text>
        )}

        <TouchableOpacity
          style={[styles.primaryButton, saving && styles.disabledButton]}
          onPress={dispenseOnly}
          disabled={saving}
        >
          {saving ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.primaryButtonText}>Working...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>Dispense Only</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.successButton, saving && styles.disabledButton]}
          onPress={dispenseAndCompleteVisit}
          disabled={saving}
        >
          {saving ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator color="#fff" />
              <Text style={styles.primaryButtonText}>Working...</Text>
            </View>
          ) : (
            <Text style={styles.primaryButtonText}>
              Dispense + Complete Visit
            </Text>
          )}
        </TouchableOpacity>

        <Text style={styles.footerNote}>
          Use “Dispense Only” if the patient needs multiple medications.  
          Use “Dispense + Complete Visit” when dispensing is finished.
        </Text>
      </View>
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

  sectionTitleRow: {
    marginTop: 20,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },

  selectCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  selectCardActive: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },

  outOfStockCard: {
    opacity: 0.65,
  },

  selectTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#111827",
  },

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  note: {
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 4,
  },

  outOfStockText: {
    marginTop: 6,
    color: "#b91c1c",
    fontWeight: "bold",
  },

  formCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
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

  helperText: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
  },

  primaryButton: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },

  successButton: {
    backgroundColor: "#16a34a",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  primaryButtonText: {
    color: "#fff",
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

  footerNote: {
    marginTop: 12,
    fontSize: 13,
    color: "#6b7280",
  },
});
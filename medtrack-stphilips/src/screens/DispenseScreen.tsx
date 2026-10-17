import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
  TextInput,
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

type QueueVisit = {
  _id: string;
  visitNumber?: string;
  status: string;
  currentDepartment: string;
  notes?: string;
  createdAt?: string;
  patient?: Patient;
  prescriptions?: Prescription[];
};

type Drug = {
  _id: string;
  name?: string;
  category?: string;
  quantity?: number;
};

type InventoryItem = {
  _id: string;
  quantity?: number;
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

function normalizeName(value?: string) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function getRemainingQuantity(rx: Prescription) {
  const prescribed = Number(rx.quantity || 0);
  const dispensed = Number(rx.dispensedQuantity || 0);

  return Math.max(prescribed - dispensed, 0);
}

function getPrescriptionStatus(rx: Prescription) {
  if (rx.dispensed === true) {
    return {
      label: "Dispensed",
      color: "#15803d",
    };
  }

  const remaining = getRemainingQuantity(rx);
  const prescribed = Number(rx.quantity || 0);

  if (remaining < prescribed && remaining > 0) {
    return {
      label: "Partial",
      color: "#b45309",
    };
  }

  if (remaining === 0) {
    return {
      label: "Dispensed",
      color: "#15803d",
    };
  }

  return {
    label: "Pending",
    color: "#2563eb",
  };
}

export default function DispenseScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [queue, setQueue] = useState<QueueVisit[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);
  const [inventory, setInventory] = useState<InventoryItem[]>([]);

  const [selectedVisitId, setSelectedVisitId] = useState<string | null>(null);
  const [selectedPrescriptionIndex, setSelectedPrescriptionIndex] = useState<
    number | null
  >(null);
  const [quantity, setQuantity] = useState("");

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canDispense =
    user?.role === "admin" || user?.role === "pharmacist";

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

        setQueue(
          Array.isArray(queueRes.data?.queue) ? queueRes.data.queue : []
        );
        setDrugs(Array.isArray(drugsRes.data) ? drugsRes.data : []);
        setInventory(
          Array.isArray(inventoryRes.data) ? inventoryRes.data : []
        );
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

  const getStock = useCallback(
    (drugId?: string) => {
      if (!drugId) return 0;

      const inventoryStock = stockByDrug[drugId];

      if (inventoryStock !== undefined) {
        return Number(inventoryStock || 0);
      }

      const drug = drugs.find((item) => item._id === drugId);

      return Number(drug?.quantity || 0);
    },
    [drugs, stockByDrug]
  );

  const getMatchedDrug = useCallback(
    (rx: Prescription): Drug | null => {
      const rxName = normalizeName(rx.drugName);
      const combined = normalizeName(
        `${rx.drugName || ""} ${rx.strength || ""}`
      );

      if (!rxName) {
        return null;
      }

      const exactCombined = drugs.find(
        (drug) => normalizeName(drug.name) === combined
      );

      if (exactCombined) {
        return exactCombined;
      }

      const exactName = drugs.find(
        (drug) => normalizeName(drug.name) === rxName
      );

      if (exactName) {
        return exactName;
      }

      const looseMatch = drugs.find((drug) => {
        const drugName = normalizeName(drug.name);

        if (drugName.length <= 2 || rxName.length <= 2) {
          return false;
        }

        return drugName.includes(rxName) || rxName.includes(drugName);
      });

      return looseMatch || null;
    },
    [drugs]
  );

  const selectedVisit = useMemo(
    () => queue.find((visit) => visit._id === selectedVisitId) || null,
    [queue, selectedVisitId]
  );

  const selectedPrescription = useMemo(() => {
    if (!selectedVisit || selectedPrescriptionIndex === null) {
      return null;
    }

    return (
      selectedVisit.prescriptions?.[selectedPrescriptionIndex] || null
    );
  }, [selectedVisit, selectedPrescriptionIndex]);

  const selectedMatchedDrug = useMemo(() => {
    if (!selectedPrescription) {
      return null;
    }

    return getMatchedDrug(selectedPrescription);
  }, [selectedPrescription, getMatchedDrug]);

  const selectedRemaining = useMemo(() => {
    if (!selectedPrescription) {
      return 0;
    }

    return getRemainingQuantity(selectedPrescription);
  }, [selectedPrescription]);

  const pendingPrescriptions = useMemo(() => {
    if (!selectedVisit) {
      return [];
    }

    return (selectedVisit.prescriptions || [])
      .map((rx, index) => {
        const remaining = getRemainingQuantity(rx);
        const matchedDrug = getMatchedDrug(rx);

        return {
          rx,
          index,
          remaining,
          matchedDrug,
        };
      })
      .filter((item) => !item.rx.dispensed && item.remaining > 0);
  }, [selectedVisit, getMatchedDrug]);

  const canDispenseAll =
    pendingPrescriptions.length > 0 &&
    pendingPrescriptions.every((item) => item.matchedDrug);

  const canCompleteWithoutDispensing =
    !!selectedVisit && pendingPrescriptions.length === 0;

  const selectVisit = (visitId: string) => {
    setSelectedVisitId(visitId);
    setSelectedPrescriptionIndex(null);
    setQuantity("");
    setError(null);
    setSuccess(null);
  };

  const selectPrescription = (index: number) => {
    if (!selectedVisit) {
      return;
    }

    const rx = selectedVisit.prescriptions?.[index];

    if (!rx) {
      return;
    }

    setSelectedPrescriptionIndex(index);

    const remaining = getRemainingQuantity(rx);
    setQuantity(remaining > 0 ? String(remaining) : "");
    setError(null);
    setSuccess(null);
  };

  const dispenseSelectedPrescription = async () => {
    setError(null);
    setSuccess(null);

    if (!selectedVisit) {
      setError("Select a patient from the dispensary queue.");
      return;
    }

    if (selectedPrescriptionIndex === null || !selectedPrescription) {
      setError("Select a prescribed medicine first.");
      return;
    }

    if (selectedPrescription.dispensed === true) {
      setError("This prescription has already been dispensed.");
      return;
    }

    if (!selectedMatchedDrug) {
      setError(
        `No matching drug found in inventory for ${
          selectedPrescription.drugName || "this prescription"
        }.`
      );
      return;
    }

    const parsedQuantity = Number(quantity);

    if (
      !quantity.trim() ||
      !Number.isFinite(parsedQuantity) ||
      parsedQuantity <= 0 ||
      !Number.isInteger(parsedQuantity)
    ) {
      setError("Enter a valid whole quantity greater than zero.");
      return;
    }

    if (parsedQuantity > selectedRemaining) {
      setError(
        `Requested quantity is ${parsedQuantity}, but remaining prescribed quantity is ${selectedRemaining}.`
      );
      return;
    }

    const stock = getStock(selectedMatchedDrug._id);

    if (parsedQuantity > stock) {
      setError(
        `Requested quantity is ${parsedQuantity}, but available stock is ${stock}.`
      );
      return;
    }

    try {
      setSaving(true);

      const res = await API.post("/dispense/prescription", {
        visitId: selectedVisit._id,
        prescriptionIndex: selectedPrescriptionIndex,
        drugId: selectedMatchedDrug._id,
        quantity: parsedQuantity,
        completeVisit: false,
      });

      const alerts = Array.isArray(res.data?.alerts)
        ? res.data.alerts
        : [];

      const baseMessage = `Dispensed ${parsedQuantity} × ${
        selectedMatchedDrug.name ||
        selectedPrescription.drugName ||
        "medicine"
      } for ${selectedVisit.patient?.name || "patient"}.`;

      if (alerts.length > 0) {
        setSuccess(`${baseMessage}\n\nWarnings:\n- ${alerts.join("\n- ")}`);
      } else {
        setSuccess(baseMessage);
      }

      setSelectedPrescriptionIndex(null);
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

  const dispenseAllRemainingAndComplete = async () => {
    setError(null);
    setSuccess(null);

    if (!selectedVisit) {
      setError("Select a patient from the dispensary queue.");
      return;
    }

    if (pendingPrescriptions.length === 0) {
      setError("No pending prescriptions to dispense.");
      return;
    }

    const unmatched = pendingPrescriptions.filter(
      (item) => !item.matchedDrug
    );

    if (unmatched.length > 0) {
      const names = unmatched
        .map((item) => item.rx.drugName || "Unknown medicine")
        .join(", ");

      setError(
        `Cannot dispense all because these prescribed drugs were not found in inventory: ${names}.`
      );
      return;
    }

    try {
      setSaving(true);

      for (const item of pendingPrescriptions) {
        if (!item.matchedDrug) {
          continue;
        }

        await API.post("/dispense/prescription", {
          visitId: selectedVisit._id,
          prescriptionIndex: item.index,
          drugId: item.matchedDrug._id,
          quantity: item.remaining,
          completeVisit: false,
        });
      }

      await API.patch(`/visits/${selectedVisit._id}/move`, {
        status: "completed",
        notes: `All prescribed medications dispensed by ${
          user?.name || "pharmacist"
        }`,
      });

      setSuccess(
        `All pending prescriptions dispensed and visit completed for ${
          selectedVisit.patient?.name || "patient"
        }.`
      );

      setSelectedVisitId(null);
      setSelectedPrescriptionIndex(null);
      setQuantity("");

      await loadData(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Dispense all and complete failed";

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

  const completeWithoutDispensing = async () => {
    setError(null);
    setSuccess(null);

    if (!selectedVisit) {
      setError("Select a patient from the dispensary queue.");
      return;
    }

    if (pendingPrescriptions.length > 0) {
      setError(
        "Cannot complete this visit because there are still pending prescriptions."
      );
      return;
    }

    try {
      setSaving(true);

      await API.patch(`/visits/${selectedVisit._id}/move`, {
        status: "completed",
        notes: `Visit completed by ${user?.name || "pharmacist"}`,
      });

      setSuccess(
        `Visit completed for ${
          selectedVisit.patient?.name || "patient"
        }.`
      );

      setSelectedVisitId(null);
      setSelectedPrescriptionIndex(null);
      setQuantity("");

      await loadData(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to complete visit";

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
        subtitle="Please wait while patients, prescriptions, drugs, and stock load."
      />
    );
  }

  if (!canDispense) {
    return (
      <ErrorState
        message="Only pharmacists and administrators can access dispensing."
        onRetry={() => router.replace("/worklist")}
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
      <Text style={styles.title}>💊 Dispensary</Text>

      <Text style={styles.subtitle}>
        Select a patient, review prescribed medicines, dispense stock, and
        complete the visit.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <Text style={styles.sectionTitle}>
        1. Patients Waiting in Dispensary
      </Text>

      {queue.length === 0 ? (
        <EmptyState
          title="No patients are currently waiting in dispensary."
          subtitle="Move a patient to dispensary from doctor or billing workflow."
        />
      ) : (
        queue.map((visit) => {
          const patient = visit.patient || {};
          const active = selectedVisitId === visit._id;
          const prescriptionCount =
            visit.prescriptions?.length || 0;

          return (
            <TouchableOpacity
              key={visit._id}
              onPress={() => selectVisit(visit._id)}
              style={[
                styles.selectCard,
                active && styles.selectCardActive,
              ]}
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
                Prescriptions: {prescriptionCount}
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

      {selectedVisit ? (
        <>
          {selectedVisit.patient?._id ? (
            <TouchableOpacity
              style={{
                backgroundColor: "#ca8a04",
                padding: 12,
                borderRadius: 10,
                alignItems: "center",
                marginBottom: 12,
              }}
              onPress={() => {
                const pid = selectedVisit.patient?._id;
                if (pid) {
                  router.push(
                    `/edit-patient?id=${encodeURIComponent(pid)}`
                  );
                }
              }}
              disabled={saving}
            >
              <Text style={{ color: "#fff", fontWeight: "bold" }}>
                ✏️ Edit Patient
              </Text>
            </TouchableOpacity>
          ) : null}

          <Text style={styles.sectionTitle}>
            2. Prescribed Medicines for{" "}
            {selectedVisit.patient?.name || "Patient"}
          </Text>

          {!selectedVisit.prescriptions ||
          selectedVisit.prescriptions.length === 0 ? (
            <View style={styles.infoCard}>
              <Text style={styles.infoText}>
                No prescription was recorded for this visit.
              </Text>

              <Text style={styles.infoText}>
                You can complete the visit without dispensing if medication
                was handled outside the system.
              </Text>
            </View>
          ) : (
            selectedVisit.prescriptions.map((rx, index) => {
              const status = getPrescriptionStatus(rx);
              const remaining = getRemainingQuantity(rx);
              const matchedDrug = getMatchedDrug(rx);
              const active = selectedPrescriptionIndex === index;

              return (
                <TouchableOpacity
                  key={`${rx.drugName}-${index}`}
                  onPress={() => selectPrescription(index)}
                  style={[
                    styles.prescriptionCard,
                    active && styles.prescriptionCardActive,
                    !matchedDrug && styles.unmatchedCard,
                  ]}
                  disabled={saving}
                >
                  <View style={styles.prescriptionHeader}>
                    <Text style={styles.prescriptionTitle}>
                      Medicine #{index + 1}
                    </Text>

                    <View
                      style={[
                        styles.statusPill,
                        { backgroundColor: status.color },
                      ]}
                    >
                      <Text style={styles.statusPillText}>
                        {status.label}
                      </Text>
                    </View>
                  </View>

                  <Text style={styles.prescriptionName}>
                    {rx.drugName || "Unknown medicine"}
                    {rx.strength ? ` ${rx.strength}` : ""}
                  </Text>

                  <Text style={styles.detail}>
                    Prescribed Quantity: {rx.quantity ?? "—"}
                  </Text>

                  <Text style={styles.detail}>
                    Dispensed Quantity: {rx.dispensedQuantity ?? 0}
                  </Text>

                  <Text style={styles.detail}>
                    Remaining Quantity: {remaining}
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
                      Instructions: {rx.instructions}
                    </Text>
                  ) : null}

                  {rx.dispensedAt ? (
                    <Text style={styles.detail}>
                      Dispensed At: {formatDate(rx.dispensedAt)}
                    </Text>
                  ) : null}

                  {rx.dispensedByName ? (
                    <Text style={styles.detail}>
                      Dispensed By: {rx.dispensedByName}
                    </Text>
                  ) : null}

                  {matchedDrug ? (
                    <Text style={styles.matchedText}>
                      Matched inventory drug: {matchedDrug.name} | Stock:{" "}
                      {getStock(matchedDrug._id)}
                    </Text>
                  ) : (
                    <Text style={styles.unmatchedText}>
                      No matching drug found in inventory.
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })
          )}

          <Text style={styles.sectionTitle}>
            3. Dispense Action
          </Text>

          <View style={styles.formCard}>
            {selectedPrescription ? (
              <Text style={styles.helperText}>
                Selected medicine:{" "}
                {selectedPrescription.drugName || "Unknown medicine"}
                {selectedPrescription.strength
                  ? ` ${selectedPrescription.strength}`
                  : ""}
              </Text>
            ) : (
              <Text style={styles.helperText}>
                Select a prescribed medicine above.
              </Text>
            )}

            <Text style={styles.label}>Quantity to Dispense</Text>

            <TextInput
              style={styles.input}
              value={quantity}
              onChangeText={setQuantity}
              placeholder="e.g. 10"
              keyboardType="numeric"
              editable={!saving}
            />

            {selectedMatchedDrug ? (
              <Text style={styles.helperText}>
                Available stock: {getStock(selectedMatchedDrug._id)}
              </Text>
            ) : null}

            <TouchableOpacity
              style={[
                styles.primaryButton,
                saving && styles.disabledButton,
                (!selectedPrescription ||
                  !!selectedPrescription?.dispensed ||
                  !selectedMatchedDrug ||
                  selectedRemaining <= 0) &&
                  styles.disabledButton,
              ]}
              onPress={dispenseSelectedPrescription}
              disabled={
                saving ||
                !selectedPrescription ||
                !!selectedPrescription?.dispensed ||
                !selectedMatchedDrug ||
                selectedRemaining <= 0
              }
            >
              {saving ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.primaryButtonText}>Working...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>
                  Dispense Selected Prescription
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.successButton,
                saving && styles.disabledButton,
                !canDispenseAll && styles.disabledButton,
              ]}
              onPress={dispenseAllRemainingAndComplete}
              disabled={saving || !canDispenseAll}
            >
              {saving ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.primaryButtonText}>Working...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>
                  Dispense All Remaining + Complete Visit
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.secondaryButton,
                saving && styles.disabledButton,
                !canCompleteWithoutDispensing && styles.disabledButton,
              ]}
              onPress={completeWithoutDispensing}
              disabled={saving || !canCompleteWithoutDispensing}
            >
              <Text style={styles.secondaryButtonText}>
                Complete Visit Without Dispensing
              </Text>
            </TouchableOpacity>
          </View>
        </>
      ) : null}

      <Text style={styles.sectionTitle}>
        4. Available Drugs Reference
      </Text>

      {drugs.length === 0 ? (
        <EmptyState
          title="No drugs found."
          subtitle="Ask an administrator to create drugs and add stock first."
        />
      ) : (
        drugs.map((drug) => {
          const stock = getStock(drug._id);

          return (
            <View key={drug._id} style={styles.drugCard}>
              <Text style={styles.drugName}>
                {drug.name || "Unknown Drug"}
              </Text>

              <Text style={styles.detail}>
                Category: {drug.category || "—"}
              </Text>

              <Text style={styles.detail}>
                Stock: {stock}
              </Text>
            </View>
          );
        })
      )}
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

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 20,
    marginBottom: 10,
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

  infoCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },

  infoText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 6,
  },

  prescriptionCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  prescriptionCardActive: {
    borderColor: "#16a34a",
    backgroundColor: "#f0fdf4",
  },

  unmatchedCard: {
    borderColor: "#fca5a5",
    backgroundColor: "#fef2f2",
  },

  prescriptionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  prescriptionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
  },

  prescriptionName: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusPillText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
  },

  matchedText: {
    marginTop: 8,
    fontSize: 13,
    color: "#15803d",
    fontWeight: "600",
  },

  unmatchedText: {
    marginTop: 8,
    fontSize: 13,
    color: "#b91c1c",
    fontWeight: "600",
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

  secondaryButton: {
    backgroundColor: "#e5e7eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  secondaryButtonText: {
    color: "#111827",
    fontWeight: "bold",
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

  drugCard: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  drugName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
});
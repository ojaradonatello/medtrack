import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
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
  SuccessBanner,
  EmptyState,
} from "../components/StateView";

type Drug = {
  _id: string;
  name?: string;
  category?: string;
  manufacturer?: string;
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

function formatDate(value?: string) {
  if (!value) return "N/A";

  try {
    return new Date(value).toDateString();
  } catch {
    return value;
  }
}

function daysUntil(value?: string) {
  if (!value) return null;

  try {
    const target = new Date(value);
    const now = new Date();

    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffMs = target.getTime() - now.getTime();
    return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  } catch {
    return null;
  }
}

function expiryLabel(value?: string) {
  const days = daysUntil(value);

  if (days === null) {
    return {
      text: "No expiry date",
      color: "#6b7280",
      background: "#f3f4f6",
    };
  }

  if (days < 0) {
    return {
      text: `Expired ${Math.abs(days)} day(s) ago`,
      color: "#ffffff",
      background: "#b91c1c",
    };
  }

  if (days === 0) {
    return {
      text: "Expires today",
      color: "#ffffff",
      background: "#b91c1c",
    };
  }

  if (days <= 30) {
    return {
      text: `Expires in ${days} day(s)`,
      color: "#ffffff",
      background: "#b45309",
    };
  }

  return {
    text: `Expires in ${days} day(s)`,
    color: "#166534",
    background: "#dcfce7",
  };
}

function parsePositiveInteger(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const num = Number(trimmed);

  if (!Number.isFinite(num) || !Number.isInteger(num) || num <= 0) {
    return null;
  }

  return num;
}

function parseNonNegativeInteger(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  const num = Number(trimmed);

  if (!Number.isFinite(num) || !Number.isInteger(num) || num < 0) {
    return null;
  }

  return num;
}

function isValidFutureDate(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return false;
  }

  const regex = /^\d{4}-\d{2}-\d{2}$/;

  if (!regex.test(trimmed)) {
    return false;
  }

  const date = new Date(trimmed);

  if (Number.isNaN(date.getTime())) {
    return false;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return date >= today;
}

export default function InventoryScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [inventory, setInventory] = useState<InventoryItem[]>([]);
  const [drugs, setDrugs] = useState<Drug[]>([]);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showCreateDrugForm, setShowCreateDrugForm] = useState(false);
  const [showAddStockForm, setShowAddStockForm] = useState(false);
  const [saving, setSaving] = useState(false);

  const [drugName, setDrugName] = useState("");
  const [drugCategory, setDrugCategory] = useState("");
  const [drugManufacturer, setDrugManufacturer] = useState("");
  const [drugQuantity, setDrugQuantity] = useState("");
  const [drugMinStock, setDrugMinStock] = useState("50");
  const [drugExpiryDate, setDrugExpiryDate] = useState("");

  const [selectedDrugId, setSelectedDrugId] = useState<string | null>(null);
  const [stockQuantity, setStockQuantity] = useState("");
  const [stockMinStock, setStockMinStock] = useState("");
  const [stockExpiryDate, setStockExpiryDate] = useState("");
  const [stockBatchNumber, setStockBatchNumber] = useState("");

  const canManageInventory = user?.role === "admin";

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
        const requests: Promise<any>[] = [API.get("/inventory")];

        if (canManageInventory) {
          requests.push(API.get("/drugs"));
        }

        const results = await Promise.all(requests);

        const inventoryRes = results[0];
        const drugsRes = results[1];

        setInventory(Array.isArray(inventoryRes.data) ? inventoryRes.data : []);

        if (drugsRes) {
          setDrugs(Array.isArray(drugsRes.data) ? drugsRes.data : []);
        }
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load inventory";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (status === 403) {
          setError(
            message ||
              "You do not have permission to view inventory."
          );
          setInventory([]);
          setDrugs([]);
          return;
        }

        setError(message);
        setInventory([]);
        setDrugs([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [canManageInventory, logout, router, user]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const resetForms = () => {
    setShowCreateDrugForm(false);
    setShowAddStockForm(false);

    setDrugName("");
    setDrugCategory("");
    setDrugManufacturer("");
    setDrugQuantity("");
    setDrugMinStock("50");
    setDrugExpiryDate("");

    setSelectedDrugId(null);
    setStockQuantity("");
    setStockMinStock("");
    setStockExpiryDate("");
    setStockBatchNumber("");
  };

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

  const totalItems = inventory.length;

  const totalStock = inventory.reduce((sum, item) => {
    return sum + Number(item.quantity || 0);
  }, 0);

  const lowStockItems = inventory.filter((item) => {
    const quantity = Number(item.quantity || 0);
    const minStockLevel = Number(item.minStockLevel || 50);
    return quantity <= minStockLevel;
  });

  const lowStockCount = lowStockItems.length;

  const createDrugAndInitialStock = async () => {
    if (!canManageInventory) {
      return;
    }

    setError(null);
    setSuccess(null);

    const cleanName = drugName.trim();
    const cleanCategory = drugCategory.trim();
    const cleanManufacturer = drugManufacturer.trim();
    const parsedQuantity = parsePositiveInteger(drugQuantity);
    const parsedMinStock = parseNonNegativeInteger(drugMinStock);
    const cleanExpiry = drugExpiryDate.trim();

    if (!cleanName) {
      showMessage("Required", "Enter drug name.");
      return;
    }

    if (!parsedQuantity) {
      showMessage(
        "Invalid quantity",
        "Initial stock must be a whole number greater than zero."
      );
      return;
    }

    if (parsedMinStock === null) {
      showMessage(
        "Invalid minimum stock",
        "Minimum stock must be zero or a positive whole number."
      );
      return;
    }

    if (!isValidFutureDate(cleanExpiry)) {
      showMessage(
        "Invalid expiry date",
        "Enter expiry date in YYYY-MM-DD format and it must not be in the past."
      );
      return;
    }

    try {
      setSaving(true);

      const drugRes = await API.post("/drugs", {
        name: cleanName,
        category: cleanCategory || undefined,
        manufacturer: cleanManufacturer || undefined,
        quantity: parsedQuantity,
        minStockLevel: parsedMinStock,
        expiryDate: cleanExpiry,
      });

      const createdDrugId =
        drugRes.data?._id ||
        drugRes.data?.drug?._id;

      if (!createdDrugId) {
        throw new Error("Drug was created but no drug ID was returned.");
      }

      await API.post("/inventory", {
        drug: createdDrugId,
        quantity: parsedQuantity,
        minStockLevel: parsedMinStock,
        expiryDate: cleanExpiry,
        batchNumber: undefined,
      });

      setSuccess(
        `Drug created: ${cleanName}. Initial stock added: ${parsedQuantity}.`
      );

      resetForms();
      await loadData(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create drug";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
      showMessage("Create failed", message);
    } finally {
      setSaving(false);
    }
  };

  const addStockToExistingDrug = async () => {
    if (!canManageInventory) {
      return;
    }

    setError(null);
    setSuccess(null);

    const parsedQuantity = parsePositiveInteger(stockQuantity);
    const parsedMinStock = stockMinStock.trim()
      ? parseNonNegativeInteger(stockMinStock)
      : null;

    const cleanExpiry = stockExpiryDate.trim();
    const cleanBatch = stockBatchNumber.trim();

    if (!selectedDrugId) {
      showMessage("Required", "Select a drug to add stock.");
      return;
    }

    if (!parsedQuantity) {
      showMessage(
        "Invalid quantity",
        "Stock quantity must be a whole number greater than zero."
      );
      return;
    }

    if (stockMinStock.trim() && parsedMinStock === null) {
      showMessage(
        "Invalid minimum stock",
        "Minimum stock must be zero or a positive whole number."
      );
      return;
    }

    if (cleanExpiry && !isValidFutureDate(cleanExpiry)) {
      showMessage(
        "Invalid expiry date",
        "Expiry date must be in YYYY-MM-DD format and must not be in the past."
      );
      return;
    }

    const selectedDrug = drugs.find((d) => d._id === selectedDrugId);

    try {
      setSaving(true);

      await API.post("/inventory", {
        drug: selectedDrugId,
        quantity: parsedQuantity,
        minStockLevel: parsedMinStock ?? undefined,
        expiryDate: cleanExpiry || undefined,
        batchNumber: cleanBatch || undefined,
      });

      setSuccess(
        `Added ${parsedQuantity} stock to ${selectedDrug?.name || "selected drug"}.`
      );

      resetForms();
      await loadData(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to add stock";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
      showMessage("Add stock failed", message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <LoadingState
        title="Loading inventory..."
        subtitle="Please wait while medicine stock loads."
      />
    );
  }

  if (error && inventory.length === 0) {
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
      <Text style={styles.title}>💊 Inventory</Text>

      <Text style={styles.subtitle}>
        Medicine stock levels, minimum stock alerts, expiry status, and admin stock entry.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role: {user?.role || "unknown"}
      </Text>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Items</Text>
          <Text style={styles.summaryValue}>{totalItems}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Stock</Text>
          <Text style={styles.summaryValue}>{totalStock}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Low Stock Items</Text>
          <Text
            style={[
              styles.summaryValue,
              lowStockCount > 0 && { color: "#b91c1c" },
            ]}
          >
            {lowStockCount}
          </Text>
        </View>
      </View>

      {canManageInventory ? (
        <>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Admin Actions</Text>
          </View>

          {!showCreateDrugForm && !showAddStockForm ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={() => {
                  setShowCreateDrugForm(true);
                  setShowAddStockForm(false);
                  setSuccess(null);
                  setError(null);
                }}
                disabled={saving}
              >
                <Text style={styles.primaryButtonText}>
                  Create Drug + Initial Stock
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.secondaryButton}
                onPress={() => {
                  setShowAddStockForm(true);
                  setShowCreateDrugForm(false);
                  setSuccess(null);
                  setError(null);
                }}
                disabled={saving}
              >
                <Text style={styles.secondaryButtonText}>
                  Add Stock to Existing Drug
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          {showCreateDrugForm ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Create Drug + Initial Stock</Text>

              <Text style={styles.label}>Drug Name</Text>
              <TextInput
                style={styles.input}
                value={drugName}
                onChangeText={setDrugName}
                placeholder="e.g. Amoxicillin 500mg"
                autoCapitalize="words"
                editable={!saving}
              />

              <Text style={styles.label}>Category</Text>
              <TextInput
                style={styles.input}
                value={drugCategory}
                onChangeText={setDrugCategory}
                placeholder="e.g. Antibiotic"
                editable={!saving}
              />

              <Text style={styles.label}>Manufacturer</Text>
              <TextInput
                style={styles.input}
                value={drugManufacturer}
                onChangeText={setDrugManufacturer}
                placeholder="Optional"
                editable={!saving}
              />

              <Text style={styles.label}>Initial Stock Quantity</Text>
              <TextInput
                style={styles.input}
                value={drugQuantity}
                onChangeText={setDrugQuantity}
                placeholder="e.g. 1000"
                keyboardType="numeric"
                editable={!saving}
              />

              <Text style={styles.label}>Minimum Stock Level</Text>
              <TextInput
                style={styles.input}
                value={drugMinStock}
                onChangeText={setDrugMinStock}
                placeholder="e.g. 50"
                keyboardType="numeric"
                editable={!saving}
              />

              <Text style={styles.label}>Expiry Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                value={drugExpiryDate}
                onChangeText={setDrugExpiryDate}
                placeholder="e.g. 2027-12-31"
                autoCapitalize="none"
                editable={!saving}
              />

              <View style={styles.formActionRow}>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    styles.flexButton,
                    saving && styles.disabledButton,
                  ]}
                  onPress={createDrugAndInitialStock}
                  disabled={saving}
                >
                  {saving ? (
                    <View style={styles.buttonContent}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.primaryButtonText}>Saving...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryButtonText}>Create Drug</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, styles.flexButton]}
                  onPress={resetForms}
                  disabled={saving}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          {showAddStockForm ? (
            <View style={styles.formCard}>
              <Text style={styles.formTitle}>Add Stock to Existing Drug</Text>

              <Text style={styles.label}>Select Drug</Text>

              {drugs.length === 0 ? (
                <View style={styles.emptySmallBox}>
                  <Text style={styles.emptySmallText}>
                    No drugs found. Create a drug first.
                  </Text>
                </View>
              ) : (
                <View style={styles.drugSelectList}>
                  {drugs.map((drug) => {
                    const active = selectedDrugId === drug._id;
                    const stock =
                      stockByDrug[drug._id] ?? Number(drug.quantity || 0);

                    return (
                      <TouchableOpacity
                        key={drug._id}
                        onPress={() => setSelectedDrugId(drug._id)}
                        style={[
                          styles.drugSelectItem,
                          active && styles.drugSelectItemActive,
                        ]}
                        disabled={saving}
                      >
                        <Text style={styles.drugSelectName}>
                          {drug.name || "Unknown Drug"}
                        </Text>

                        <Text style={styles.drugSelectMeta}>
                          Current stock: {stock}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}

              <Text style={styles.label}>Quantity to Add</Text>
              <TextInput
                style={styles.input}
                value={stockQuantity}
                onChangeText={setStockQuantity}
                placeholder="e.g. 500"
                keyboardType="numeric"
                editable={!saving}
              />

              <Text style={styles.label}>Minimum Stock Level (optional)</Text>
              <TextInput
                style={styles.input}
                value={stockMinStock}
                onChangeText={setStockMinStock}
                placeholder="e.g. 50"
                keyboardType="numeric"
                editable={!saving}
              />

              <Text style={styles.label}>
                Expiry Date (optional, YYYY-MM-DD)
              </Text>
              <TextInput
                style={styles.input}
                value={stockExpiryDate}
                onChangeText={setStockExpiryDate}
                placeholder="e.g. 2027-12-31"
                autoCapitalize="none"
                editable={!saving}
              />

              <Text style={styles.label}>Batch Number (optional)</Text>
              <TextInput
                style={styles.input}
                value={stockBatchNumber}
                onChangeText={setStockBatchNumber}
                placeholder="e.g. BATCH-001"
                autoCapitalize="characters"
                editable={!saving}
              />

              <View style={styles.formActionRow}>
                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    styles.flexButton,
                    saving && styles.disabledButton,
                  ]}
                  onPress={addStockToExistingDrug}
                  disabled={saving}
                >
                  {saving ? (
                    <View style={styles.buttonContent}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.primaryButtonText}>Saving...</Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryButtonText}>Add Stock</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.secondaryButton, styles.flexButton]}
                  onPress={resetForms}
                  disabled={saving}
                >
                  <Text style={styles.secondaryButtonText}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}
        </>
      ) : null}

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Inventory Items</Text>
      </View>

      {inventory.length === 0 ? (
        <EmptyState
          title="No inventory available."
          subtitle={
            canManageInventory
              ? "Create a drug and initial stock above."
              : "Ask an administrator to add inventory."
          }
        />
      ) : null}

      {inventory.map((item) => {
        const quantity = Number(item.quantity || 0);
        const minStockLevel = Number(item.minStockLevel || 50);
        const isLow = quantity <= minStockLevel;
        const expiry = expiryLabel(item.expiryDate);

        return (
          <View
            key={item._id}
            style={[
              styles.card,
              isLow && styles.lowStockCard,
            ]}
          >
            <Text style={styles.drugName}>
              {item.drug?.name || "Unknown Drug"}
            </Text>

            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.stockBadge,
                  isLow ? styles.dangerBadge : styles.successBadge,
                ]}
              >
                <Text style={styles.badgeText}>
                  Stock: {quantity}
                </Text>
              </View>

              <View style={styles.minBadge}>
                <Text style={styles.badgeText}>
                  Min: {minStockLevel}
                </Text>
              </View>

              <View
                style={[
                  styles.expiryBadge,
                  { backgroundColor: expiry.background },
                ]}
              >
                <Text
                  style={[
                    styles.badgeText,
                    { color: expiry.color },
                  ]}
                >
                  {expiry.text}
                </Text>
              </View>
            </View>

            <Text style={styles.detail}>
              Expiry date: {formatDate(item.expiryDate)}
            </Text>

            {item.batchNumber ? (
              <Text style={styles.detail}>
                Batch: {item.batchNumber}
              </Text>
            ) : null}

            {isLow ? (
              <Text style={styles.lowStockText}>
                ⚠ Low stock alert: quantity is at or below minimum stock level.
              </Text>
            ) : null}
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

  sectionTitleRow: {
    marginTop: 20,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
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

  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 16,
  },

  formCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2563eb",
    marginBottom: 16,
  },

  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
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

  drugSelectList: {
    marginBottom: 12,
  },

  drugSelectItem: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },

  drugSelectItemActive: {
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
  },

  drugSelectName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
  },

  drugSelectMeta: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },

  formActionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },

  flexButton: {
    flex: 1,
    minWidth: 140,
  },

  primaryButton: {
    backgroundColor: "#2563eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },

  secondaryButton: {
    backgroundColor: "#e5e7eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#111827",
    fontWeight: "bold",
    fontSize: 15,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  emptySmallBox: {
    backgroundColor: "#f3f4f6",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
  },

  emptySmallText: {
    color: "#6b7280",
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  lowStockCard: {
    borderColor: "#fca5a5",
    backgroundColor: "#fff1f2",
  },

  drugName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#111827",
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  stockBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  minBadge: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  expiryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  successBadge: {
    backgroundColor: "#16a34a",
  },

  dangerBadge: {
    backgroundColor: "#dc2626",
  },

  badgeText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
  },

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  lowStockText: {
    marginTop: 8,
    color: "#b91c1c",
    fontWeight: "600",
  },
});
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  StyleSheet,
  RefreshControl,
} from "react-native";

import { useRouter } from "expo-router";

import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

import {
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

type BillItemInput = {
  id: string;
  description: string;
  category: string;
  quantity: string;
  unitPrice: string;
};

type BillPayment = {
  amount?: number;
  method?: string;
  reference?: string;
  note?: string;
  collectedByName?: string;
  paidAt?: string;
};

type Bill = {
  _id: string;
  billNumber?: string;
  facilityType?: string;
  status?: string;
  patient?: Patient | null;
  customerName?: string;
  customerPhone?: string;
  visit?: {
    _id?: string;
    visitNumber?: string;
    status?: string;
    currentDepartment?: string;
  } | null;
  items?: any[];
  subtotal?: number;
  discount?: number;
  chargedAmount?: number;
  paidAmount?: number;
  balance?: number;
  payments?: BillPayment[];
  notes?: string;
  voidReason?: string;
  createdAt?: string;
  createdBy?: {
    name?: string;
    role?: string;
  } | null;
};

const ALLOWED_ROLES = [
  "admin",
  "billing",
  "reception",
  "pharmacist",
  "staff",
];

const FACILITY_TYPES = [
  { value: "clinic", label: "Clinic" },
  { value: "drug_shop", label: "Drug Shop" },
  { value: "hospital", label: "Hospital" },
  { value: "walk_in", label: "Walk-in" },
];

const ITEM_CATEGORIES = [
  { value: "consultation", label: "Consultation" },
  { value: "laboratory", label: "Laboratory" },
  { value: "procedure", label: "Procedure" },
  { value: "medicine", label: "Medicine" },
  { value: "service", label: "Service" },
  { value: "other", label: "Other" },
];

const PAYMENT_METHODS = [
  { value: "cash", label: "Cash" },
  { value: "mobile_money", label: "Mobile Money" },
  { value: "bank_transfer", label: "Bank Transfer" },
  { value: "insurance", label: "Insurance" },
  { value: "other", label: "Other" },
];

function makeEmptyItem(): BillItemInput {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    description: "",
    category: "service",
    quantity: "1",
    unitPrice: "",
  };
}

function formatMoney(value?: number | string | null) {
  const num = Number(value || 0);

  if (!Number.isFinite(num)) {
    return "UGX 0";
  }

  return `UGX ${num.toLocaleString()}`;
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

function getStatusColor(status?: string) {
  switch (status) {
    case "paid":
      return "#15803d";
    case "partial":
      return "#b45309";
    case "open":
      return "#2563eb";
    case "void":
      return "#b91c1c";
    case "refunded":
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

export default function BillingCounterScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const allowed = ALLOWED_ROLES.includes(user?.role || "");

  const [facilityType, setFacilityType] = useState("clinic");

  const [patientSearch, setPatientSearch] = useState("");
  const [searching, setSearching] = useState(false);
  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");

  const [items, setItems] = useState<BillItemInput[]>([makeEmptyItem()]);
  const [discount, setDiscount] = useState("");
  const [notes, setNotes] = useState("");

  const [initialAmount, setInitialAmount] = useState("");
  const [initialMethod, setInitialMethod] = useState("cash");
  const [initialReference, setInitialReference] = useState("");
  const [initialNote, setInitialNote] = useState("");

  const [creating, setCreating] = useState(false);

  const [currentBill, setCurrentBill] = useState<Bill | null>(null);

  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [paymentReference, setPaymentReference] = useState("");
  const [paymentNote, setPaymentNote] = useState("");
  const [paying, setPaying] = useState(false);

  const [voidReason, setVoidReason] = useState("");
  const [voiding, setVoiding] = useState(false);

  const [recentBills, setRecentBills] = useState<Bill[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const totals = useMemo(() => {
    let subtotal = 0;

    for (const item of items) {
      const quantity = Number(item.quantity || 0);
      const unitPrice = Number(item.unitPrice || 0);

      if (
        Number.isFinite(quantity) &&
        Number.isFinite(unitPrice) &&
        quantity > 0 &&
        unitPrice >= 0
      ) {
        subtotal += quantity * unitPrice;
      }
    }

    const discountValue = Number(discount || 0);
    const safeDiscount =
      Number.isFinite(discountValue) && discountValue > 0
        ? Math.min(discountValue, subtotal)
        : 0;

    const charged = Math.max(subtotal - safeDiscount, 0);

    const paid = currentBill ? Number(currentBill.paidAmount || 0) : 0;
    const balance = currentBill
      ? Number(currentBill.balance || 0)
      : Math.max(charged - paid, 0);

    return {
      subtotal,
      discount: safeDiscount,
      charged,
      paid,
      balance,
    };
  }, [items, discount, currentBill]);

  const loadRecentBills = useCallback(
    async (isRefresh = false) => {
      if (!allowed) return;

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoadingRecent(true);
      }

      try {
        const res = await API.get("/bills", {
          params: {
            range: "today",
            limit: 20,
          },
        });

        setRecentBills(
          Array.isArray(res.data?.bills) ? res.data.bills : []
        );
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load recent bills";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        setError(message);
      } finally {
        setLoadingRecent(false);
        setRefreshing(false);
      }
    },
    [allowed, logout, router]
  );

  useEffect(() => {
    if (allowed) {
      loadRecentBills(false);
    }
  }, [allowed, loadRecentBills]);

  const searchPatients = async () => {
    const term = patientSearch.trim();

    if (!term) {
      setError("Enter a patient name or phone to search.");
      return;
    }

    try {
      setSearching(true);
      setError(null);

      const res = await API.get("/patients/search", {
        params: {
          name: term,
        },
      });

      const results = Array.isArray(res.data?.results)
        ? res.data.results
        : [];

      const patients = results
        .map((row: any) => row?.patient)
        .filter(Boolean);

      setPatientResults(patients);

      if (patients.length === 0) {
        setSuccess("No matching patient found. You can use walk-in customer.");
      } else {
        setSuccess(null);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to search patients";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
    } finally {
      setSearching(false);
    }
  };

  const selectPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setPatientResults([]);
    setPatientSearch("");
    setCustomerName("");
    setCustomerPhone("");
    setError(null);
    setSuccess(null);
  };

  const clearPatient = () => {
    setSelectedPatient(null);
    setCustomerName("");
    setCustomerPhone("");
    setPatientSearch("");
    setPatientResults([]);
  };

  const addItem = () => {
    setItems((prev) => [...prev, makeEmptyItem()]);
  };

  const removeItem = (index: number) => {
    setItems((prev) =>
      prev.length > 1 ? prev.filter((_, i) => i !== index) : prev
    );
  };

  const updateItem = (
    index: number,
    field: keyof BillItemInput,
    value: string
  ) => {
    setItems((prev) =>
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

  const resetNewBill = () => {
    setCurrentBill(null);
    setItems([makeEmptyItem()]);
    setDiscount("");
    setNotes("");
    setInitialAmount("");
    setInitialMethod("cash");
    setInitialReference("");
    setInitialNote("");
    setPaymentAmount("");
    setPaymentMethod("cash");
    setPaymentReference("");
    setPaymentNote("");
    setVoidReason("");
    setError(null);
    setSuccess(null);
  };

  const buildItemsPayload = () => {
    const cleaned = items
      .map((row) => ({
        description: row.description.trim(),
        category: row.category,
        quantity: Number(row.quantity || 0),
        unitPrice: Number(row.unitPrice || 0),
      }))
      .filter((row) => row.description);

    if (cleaned.length === 0) {
      return {
        error: "Add at least one bill item with a description.",
        data: null,
      };
    }

    for (let index = 0; index < cleaned.length; index += 1) {
      const row = cleaned[index];

      if (!Number.isFinite(row.quantity) || row.quantity <= 0) {
        return {
          error: `Item ${index + 1} needs a valid quantity greater than zero.`,
          data: null,
        };
      }

      if (!Number.isFinite(row.unitPrice) || row.unitPrice < 0) {
        return {
          error: `Item ${index + 1} needs a valid unit price.`,
          data: null,
        };
      }
    }

    return {
      error: null,
      data: cleaned,
    };
  };

  const createBill = async () => {
    if (!allowed) {
      setError("You do not have permission to create bills.");
      return;
    }

    const itemsResult = buildItemsPayload();

    if (itemsResult.error || !itemsResult.data) {
      setError(itemsResult.error || "Invalid bill items.");
      showMessage("Bill error", itemsResult.error || "Invalid bill items.");
      return;
    }

    const discountValue = Number(discount || 0);

    if (!Number.isFinite(discountValue) || discountValue < 0) {
      setError("Discount must be a valid number.");
      return;
    }

    if (discountValue > totals.subtotal) {
      setError("Discount cannot be greater than subtotal.");
      return;
    }

    const initialPaymentValue = Number(initialAmount || 0);

    if (!Number.isFinite(initialPaymentValue) || initialPaymentValue < 0) {
      setError("Initial payment must be a valid number.");
      return;
    }

    if (initialPaymentValue > totals.charged) {
      setError("Initial payment cannot be greater than charged amount.");
      return;
    }

    if (initialPaymentValue > 0 && !initialMethod) {
      setError("Select a payment method for initial payment.");
      return;
    }

    const payload: any = {
      facilityType,
      items: itemsResult.data,
      discount: discountValue,
      notes: notes.trim() || undefined,
    };

    if (selectedPatient?._id) {
      payload.patient = selectedPatient._id;
    } else {
      payload.customerName =
        customerName.trim() || "Walk-in Customer";
      payload.customerPhone =
        customerPhone.trim() || undefined;
    }

    if (initialPaymentValue > 0) {
      payload.initialPayment = {
        amount: initialPaymentValue,
        method: initialMethod,
        reference: initialReference.trim() || undefined,
        note: initialNote.trim() || undefined,
      };
    }

    try {
      setCreating(true);
      setError(null);
      setSuccess(null);

      const res = await API.post("/bills", payload);

      const bill = res.data?.bill as Bill;

      setCurrentBill(bill);
      setSuccess(`Bill ${bill?.billNumber || ""} created successfully.`);

      setInitialAmount("");
      setInitialReference("");
      setInitialNote("");

      await loadRecentBills(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to create bill";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
      showMessage("Bill failed", message);
    } finally {
      setCreating(false);
    }
  };

  const addPayment = async () => {
    if (!currentBill?._id) {
      setError("No bill selected.");
      return;
    }

    const amount = Number(paymentAmount || 0);

    if (!Number.isFinite(amount) || amount <= 0) {
      setError("Payment amount must be greater than zero.");
      return;
    }

    if (amount > Number(currentBill.balance || 0)) {
      setError("Payment amount cannot be greater than outstanding balance.");
      return;
    }

    if (!paymentMethod) {
      setError("Select a payment method.");
      return;
    }

    try {
      setPaying(true);
      setError(null);
      setSuccess(null);

      const res = await API.post(
        `/bills/${currentBill._id}/payments`,
        {
          amount,
          method: paymentMethod,
          reference: paymentReference.trim() || undefined,
          note: paymentNote.trim() || undefined,
        }
      );

      const updatedBill = res.data?.bill as Bill;

      setCurrentBill(updatedBill);
      setSuccess("Payment recorded successfully.");

      setPaymentAmount("");
      setPaymentReference("");
      setPaymentNote("");

      await loadRecentBills(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to record payment";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
      showMessage("Payment failed", message);
    } finally {
      setPaying(false);
    }
  };

  const voidCurrentBill = async () => {
    if (!currentBill?._id) {
      setError("No bill selected.");
      return;
    }

    if (Number(currentBill.paidAmount || 0) > 0) {
      setError(
        "Cannot void a bill with recorded payments. Use refund workflow when available."
      );
      return;
    }

    const reason = voidReason.trim();

    if (!reason) {
      setError("Void reason is required.");
      return;
    }

    try {
      setVoiding(true);
      setError(null);
      setSuccess(null);

      const res = await API.post(`/bills/${currentBill._id}/void`, {
        reason,
      });

      const updatedBill = res.data?.bill as Bill;

      setCurrentBill(updatedBill);
      setSuccess("Bill voided successfully.");
      setVoidReason("");

      await loadRecentBills(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to void bill";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
      showMessage("Void failed", message);
    } finally {
      setVoiding(false);
    }
  };

  const openBill = async (billId: string) => {
    try {
      setError(null);
      setSuccess(null);

      const res = await API.get(`/bills/${billId}`);
      const bill = res.data?.bill as Bill;

      setCurrentBill(bill);
      setPaymentAmount("");
      setPaymentMethod("cash");
      setPaymentReference("");
      setPaymentNote("");
      setVoidReason("");
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load bill";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
    }
  };

  if (!allowed) {
    return (
      <ErrorState
        message="You do not have permission to access the billing counter."
        onRetry={() => router.replace("/worklist")}
      />
    );
  }

  const displayCustomerName =
    currentBill?.patient?.name ||
    currentBill?.customerName ||
    selectedPatient?.name ||
    customerName ||
    "Walk-in Customer";

  const displayCustomerPhone =
    currentBill?.patient?.phone ||
    currentBill?.customerPhone ||
    selectedPatient?.phone ||
    customerPhone ||
    "—";

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadRecentBills(true)}
        />
      }
    >
      <Text style={styles.title}>💳 Billing Counter</Text>

      <Text style={styles.subtitle}>
        Create bills for clinic patients, hospital patients, drug shop
        walk-in customers, and record cash/mobile money payments.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Facility Type</Text>

        <View style={styles.choiceRow}>
          {FACILITY_TYPES.map((type) => {
            const active = facilityType === type.value;

            return (
              <TouchableOpacity
                key={type.value}
                onPress={() => setFacilityType(type.value)}
                style={[
                  styles.choiceButton,
                  active && styles.choiceButtonActive,
                ]}
                disabled={!!currentBill}
              >
                <Text
                  style={[
                    styles.choiceText,
                    active && styles.choiceTextActive,
                  ]}
                >
                  {type.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {!currentBill ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Patient / Customer</Text>

          {selectedPatient ? (
            <View style={styles.selectedPatientCard}>
              <Text style={styles.selectedPatientName}>
                {selectedPatient.name || "Patient"}
              </Text>

              <Text style={styles.detail}>
                Phone: {selectedPatient.phone || "—"}
              </Text>

              <Text style={styles.detail}>
                Age: {selectedPatient.age ?? "—"}
              </Text>

              <Text style={styles.detail}>
                Gender: {selectedPatient.gender || "—"}
              </Text>

              <TouchableOpacity
                style={styles.clearButton}
                onPress={clearPatient}
              >
                <Text style={styles.clearButtonText}>
                  Clear Patient / Use Walk-in
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              <Text style={styles.label}>Search Patient</Text>

              <View style={styles.searchRow}>
                <TextInput
                  style={[styles.input, styles.searchInput]}
                  value={patientSearch}
                  onChangeText={setPatientSearch}
                  placeholder="Name or phone"
                  autoCapitalize="none"
                  editable={!searching}
                />

                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={searchPatients}
                  disabled={searching}
                >
                  {searching ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.searchButtonText}>Search</Text>
                  )}
                </TouchableOpacity>
              </View>

              {patientResults.length > 0 ? (
                <View style={styles.resultsContainer}>
                  <Text style={styles.helperText}>
                    Select a patient:
                  </Text>

                  {patientResults.map((patient) => (
                    <TouchableOpacity
                      key={patient._id}
                      style={styles.resultCard}
                      onPress={() => selectPatient(patient)}
                    >
                      <Text style={styles.resultName}>
                        {patient.name || "Unknown"}
                      </Text>

                      <Text style={styles.detail}>
                        Phone: {patient.phone || "—"}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              ) : null}

              <View style={styles.divider} />

              <Text style={styles.label}>Walk-in Customer Name</Text>
              <TextInput
                style={styles.input}
                value={customerName}
                onChangeText={setCustomerName}
                placeholder="e.g. Walk-in Customer"
                autoCapitalize="words"
              />

              <Text style={styles.label}>Walk-in Customer Phone</Text>
              <TextInput
                style={styles.input}
                value={customerPhone}
                onChangeText={setCustomerPhone}
                placeholder="e.g. 0788001234"
                keyboardType="phone-pad"
                autoCapitalize="none"
              />
            </>
          )}
        </View>
      ) : null}

      {!currentBill ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Bill Items</Text>

          {items.map((item, index) => {
            const quantity = Number(item.quantity || 0);
            const unitPrice = Number(item.unitPrice || 0);
            const amount =
              Number.isFinite(quantity) &&
              Number.isFinite(unitPrice) &&
              quantity > 0 &&
              unitPrice >= 0
                ? quantity * unitPrice
                : 0;

            return (
              <View key={item.id} style={styles.itemRow}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemIndex}>
                    Item #{index + 1}
                  </Text>

                  {items.length > 1 ? (
                    <TouchableOpacity
                      style={styles.removeItemButton}
                      onPress={() => removeItem(index)}
                    >
                      <Text style={styles.removeButtonText}>
                        Remove
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>

                <Text style={styles.label}>Description *</Text>
                <TextInput
                  style={styles.input}
                  value={item.description}
                  onChangeText={(value) =>
                    updateItem(index, "description", value)
                  }
                  placeholder="e.g. Consultation fee / Paracetamol / Malaria test"
                />

                <Text style={styles.label}>Category</Text>

                <View style={styles.categoryRow}>
                  {ITEM_CATEGORIES.map((category) => {
                    const active = item.category === category.value;

                    return (
                      <TouchableOpacity
                        key={category.value}
                        style={[
                          styles.categoryButton,
                          active && styles.categoryButtonActive,
                        ]}
                        onPress={() =>
                          updateItem(index, "category", category.value)
                        }
                      >
                        <Text
                          style={[
                            styles.categoryText,
                            active && styles.categoryTextActive,
                          ]}
                        >
                          {category.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <View style={styles.row}>
                  <View style={styles.halfField}>
                    <Text style={styles.label}>Quantity *</Text>
                    <TextInput
                      style={styles.input}
                      value={item.quantity}
                      onChangeText={(value) =>
                        updateItem(index, "quantity", value)
                      }
                      keyboardType="numeric"
                      placeholder="1"
                    />
                  </View>

                  <View style={styles.halfField}>
                    <Text style={styles.label}>Unit Price *</Text>
                    <TextInput
                      style={styles.input}
                      value={item.unitPrice}
                      onChangeText={(value) =>
                        updateItem(index, "unitPrice", value)
                      }
                      keyboardType="numeric"
                      placeholder="e.g. 10000"
                    />
                  </View>
                </View>

                <Text style={styles.amountText}>
                  Amount: {formatMoney(amount)}
                </Text>
              </View>
            );
          })}

          <TouchableOpacity
            style={styles.addItemButton}
            onPress={addItem}
          >
            <Text style={styles.addItemButtonText}>
              + Add Item
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {!currentBill ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Discount / Notes</Text>

          <Text style={styles.label}>Discount</Text>
          <TextInput
            style={styles.input}
            value={discount}
            onChangeText={setDiscount}
            keyboardType="numeric"
            placeholder="e.g. 5000"
          />

          <Text style={styles.label}>Bill Note</Text>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            value={notes}
            onChangeText={setNotes}
            placeholder="Optional note"
            multiline
          />
        </View>
      ) : null}

      <View style={styles.totalsCard}>
        <Text style={styles.sectionTitle}>Totals</Text>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>
            {formatMoney(totals.subtotal)}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Discount</Text>
          <Text style={styles.totalValue}>
            {formatMoney(totals.discount)}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Charged</Text>
          <Text style={[styles.totalValue, styles.bold]}>
            {formatMoney(totals.charged)}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Paid</Text>
          <Text style={styles.totalValue}>
            {formatMoney(totals.paid)}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Balance</Text>
          <Text
            style={[
              styles.totalValue,
              styles.bold,
              totals.balance > 0 && { color: "#b91c1c" },
            ]}
          >
            {formatMoney(totals.balance)}
          </Text>
        </View>
      </View>

      {!currentBill ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Initial Payment (optional)</Text>

          <Text style={styles.infoText}>
            You can create the bill first and record payment later, or record
            a full/partial payment now.
          </Text>

          <Text style={styles.label}>Amount Paying Now</Text>
          <TextInput
            style={styles.input}
            value={initialAmount}
            onChangeText={setInitialAmount}
            keyboardType="numeric"
            placeholder="e.g. 20000"
          />

          <Text style={styles.label}>Payment Method</Text>

          <View style={styles.methodRow}>
            {PAYMENT_METHODS.map((method) => {
              const active = initialMethod === method.value;

              return (
                <TouchableOpacity
                  key={method.value}
                  style={[
                    styles.methodButton,
                    active && styles.methodButtonActive,
                  ]}
                  onPress={() => setInitialMethod(method.value)}
                >
                  <Text
                    style={[
                      styles.methodText,
                      active && styles.methodTextActive,
                    ]}
                  >
                    {method.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.label}>Reference</Text>
          <TextInput
            style={styles.input}
            value={initialReference}
            onChangeText={setInitialReference}
            placeholder="e.g. MoMo transaction ID"
            autoCapitalize="none"
          />

          <Text style={styles.label}>Payment Note</Text>
          <TextInput
            style={styles.input}
            value={initialNote}
            onChangeText={setInitialNote}
            placeholder="Optional"
          />

          <TouchableOpacity
            style={[
              styles.primaryButton,
              creating && styles.disabledButton,
            ]}
            onPress={createBill}
            disabled={creating}
          >
            {creating ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.primaryButtonText}>Creating...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>
                Create Bill
              </Text>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Current Bill
          </Text>

          <View style={styles.billHeader}>
            <Text style={styles.billNumber}>
              {currentBill.billNumber || "—"}
            </Text>

            <View
              style={[
                styles.statusPill,
                { backgroundColor: getStatusColor(currentBill.status) },
              ]}
            >
              <Text style={styles.statusPillText}>
                {humanize(currentBill.status)}
              </Text>
            </View>
          </View>

          <Text style={styles.detail}>
            Customer: {displayCustomerName}
          </Text>

          <Text style={styles.detail}>
            Phone: {displayCustomerPhone}
          </Text>

          <Text style={styles.detail}>
            Facility: {humanize(currentBill.facilityType)}
          </Text>

          <Text style={styles.detail}>
            Created: {formatDate(currentBill.createdAt)}
          </Text>

          {currentBill.visit?.visitNumber ? (
            <Text style={styles.detail}>
              Visit: {currentBill.visit.visitNumber}
            </Text>
          ) : null}

          <View style={styles.divider} />

          <Text style={styles.subSectionTitle}>Items</Text>

          {(currentBill.items || []).map((item: any, index: number) => (
            <View key={`${item.description}-${index}`} style={styles.billItem}>
              <Text style={styles.billItemName}>
                {item.description || "Item"}
              </Text>

              <Text style={styles.detail}>
                Category: {humanize(item.category)}
              </Text>

              <Text style={styles.detail}>
                Qty: {item.quantity ?? "—"} × {formatMoney(item.unitPrice)}
              </Text>

              <Text style={styles.detail}>
                Amount: {formatMoney(item.amount)}
              </Text>
            </View>
          ))}

          <View style={styles.divider} />

          <Text style={styles.subSectionTitle}>Payments</Text>

          {(currentBill.payments || []).length === 0 ? (
            <Text style={styles.helperText}>
              No payment recorded yet.
            </Text>
          ) : (
            (currentBill.payments || []).map((payment: any, index: number) => (
              <View
                key={`${payment.paidAt}-${index}`}
                style={styles.paymentRow}
              >
                <Text style={styles.paymentAmount}>
                  {formatMoney(payment.amount)}
                </Text>

                <Text style={styles.detail}>
                  Method: {humanize(payment.method)}
                </Text>

                {payment.reference ? (
                  <Text style={styles.detail}>
                    Reference: {payment.reference}
                  </Text>
                ) : null}

                {payment.collectedByName ? (
                  <Text style={styles.detail}>
                    Collected by: {payment.collectedByName}
                  </Text>
                ) : null}

                <Text style={styles.detail}>
                  Date: {formatDate(payment.paidAt)}
                </Text>
              </View>
            ))
          )}

          <View style={styles.divider} />

          {Number(currentBill.balance || 0) > 0 &&
          currentBill.status !== "void" &&
          currentBill.status !== "refunded" ? (
            <>
              <Text style={styles.subSectionTitle}>Add Payment</Text>

              <Text style={styles.label}>Amount</Text>
              <TextInput
                style={styles.input}
                value={paymentAmount}
                onChangeText={setPaymentAmount}
                keyboardType="numeric"
                placeholder={`Balance: ${formatMoney(currentBill.balance)}`}
              />

              <Text style={styles.label}>Method</Text>

              <View style={styles.methodRow}>
                {PAYMENT_METHODS.map((method) => {
                  const active = paymentMethod === method.value;

                  return (
                    <TouchableOpacity
                      key={method.value}
                      style={[
                        styles.methodButton,
                        active && styles.methodButtonActive,
                      ]}
                      onPress={() => setPaymentMethod(method.value)}
                    >
                      <Text
                        style={[
                          styles.methodText,
                          active && styles.methodTextActive,
                        ]}
                      >
                        {method.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.label}>Reference</Text>
              <TextInput
                style={styles.input}
                value={paymentReference}
                onChangeText={setPaymentReference}
                placeholder="Optional"
                autoCapitalize="none"
              />

              <Text style={styles.label}>Note</Text>
              <TextInput
                style={styles.input}
                value={paymentNote}
                onChangeText={setPaymentNote}
                placeholder="Optional"
              />

              <TouchableOpacity
                style={[
                  styles.successButton,
                  paying && styles.disabledButton,
                ]}
                onPress={addPayment}
                disabled={paying}
              >
                {paying ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.primaryButtonText}>Saving...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Record Payment
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}

          {Number(currentBill.paidAmount || 0) === 0 &&
          currentBill.status !== "void" &&
          currentBill.status !== "refunded" ? (
            <>
              <View style={styles.divider} />

              <Text style={styles.subSectionTitle}>Void Bill</Text>

              <Text style={styles.infoText}>
                Only unpaid bills can be voided. A reason is required.
              </Text>

              <TextInput
                style={[styles.input, styles.multilineInput]}
                value={voidReason}
                onChangeText={setVoidReason}
                placeholder="Reason for voiding this bill"
                multiline
              />

              <TouchableOpacity
                style={[
                  styles.dangerButton,
                  voiding && styles.disabledButton,
                ]}
                onPress={voidCurrentBill}
                disabled={voiding}
              >
                {voiding ? (
                  <View style={styles.buttonContent}>
                    <ActivityIndicator color="#fff" />
                    <Text style={styles.primaryButtonText}>Voiding...</Text>
                  </View>
                ) : (
                  <Text style={styles.primaryButtonText}>
                    Void Bill
                  </Text>
                )}
              </TouchableOpacity>
            </>
          ) : null}

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={resetNewBill}
          >
            <Text style={styles.secondaryButtonText}>
              Start New Bill
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Today’s Bills</Text>

        {loadingRecent ? (
          <Text style={styles.helperText}>Loading recent bills...</Text>
        ) : recentBills.length === 0 ? (
          <Text style={styles.helperText}>
            No bills created today yet.
          </Text>
        ) : (
          recentBills.map((bill) => (
            <TouchableOpacity
              key={bill._id}
              style={styles.recentBillCard}
              onPress={() => openBill(bill._id)}
            >
              <View style={styles.billHeader}>
                <Text style={styles.recentBillNumber}>
                  {bill.billNumber || "—"}
                </Text>

                <View
                  style={[
                    styles.statusPillSmall,
                    { backgroundColor: getStatusColor(bill.status) },
                  ]}
                >
                  <Text style={styles.statusPillText}>
                    {humanize(bill.status)}
                  </Text>
                </View>
              </View>

              <Text style={styles.detail}>
                Customer:{" "}
                {bill.patient?.name ||
                  bill.customerName ||
                  "Walk-in Customer"}
              </Text>

              <Text style={styles.detail}>
                Charged: {formatMoney(bill.chargedAmount)}
              </Text>

              <Text style={styles.detail}>
                Paid: {formatMoney(bill.paidAmount)}
              </Text>

              <Text
                style={[
                  styles.detail,
                  Number(bill.balance || 0) > 0 && {
                    color: "#b91c1c",
                    fontWeight: "bold",
                  },
                ]}
              >
                Balance: {formatMoney(bill.balance)}
              </Text>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
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

  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },

  totalsCard: {
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#111827",
  },

  subSectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8,
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

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  helperText: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
  },

  infoText: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 12,
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },

  choiceRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  choiceButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },

  choiceButtonActive: {
    backgroundColor: "#2563eb",
  },

  choiceText: {
    color: "#111827",
    fontWeight: "600",
  },

  choiceTextActive: {
    color: "#ffffff",
  },

  searchRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    marginBottom: 0,
  },

  searchButton: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    minWidth: 90,
    alignItems: "center",
  },

  searchButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  resultsContainer: {
    marginBottom: 12,
  },

  resultCard: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  },

  resultName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },

  selectedPatientCard: {
    backgroundColor: "#eff6ff",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bfdbfe",
  },

  selectedPatientName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 6,
  },

  clearButton: {
    marginTop: 10,
    backgroundColor: "#fee2e2",
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
  },

  clearButtonText: {
    color: "#b91c1c",
    fontWeight: "bold",
  },

  itemRow: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },

  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  itemIndex: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
  },

  removeItemButton: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  removeButtonText: {
    color: "#b91c1c",
    fontWeight: "600",
  },

  row: {
    flexDirection: "row",
    gap: 10,
  },

  halfField: {
    flex: 1,
  },

  categoryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  categoryButton: {
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },

  categoryButtonActive: {
    backgroundColor: "#16a34a",
  },

  categoryText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 12,
  },

  categoryTextActive: {
    color: "#ffffff",
  },

  amountText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
  },

  addItemButton: {
    backgroundColor: "#16a34a",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  addItemButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  totalLabel: {
    color: "#d1d5db",
    fontSize: 14,
  },

  totalValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },

  bold: {
    fontWeight: "bold",
  },

  methodRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 12,
  },

  methodButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },

  methodButtonActive: {
    backgroundColor: "#7c3aed",
  },

  methodText: {
    color: "#111827",
    fontWeight: "600",
  },

  methodTextActive: {
    color: "#ffffff",
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
    marginTop: 8,
  },

  dangerButton: {
    backgroundColor: "#dc2626",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },

  secondaryButton: {
    backgroundColor: "#e5e7eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 12,
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

  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  billNumber: {
    fontSize: 17,
    fontWeight: "bold",
    color: "#111827",
  },

  recentBillNumber: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusPillSmall: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },

  statusPillText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
  },

  billItem: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  },

  billItemName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },

  paymentRow: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginBottom: 8,
  },

  paymentAmount: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#15803d",
    marginBottom: 4,
  },

  recentBillCard: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },
});
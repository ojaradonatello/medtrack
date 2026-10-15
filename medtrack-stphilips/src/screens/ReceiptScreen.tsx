import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  Platform,
  StyleSheet,
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

import {
  LoadingState,
  ErrorState,
  ErrorBanner,
} from "../components/StateView";

type Patient = {
  name?: string;
  phone?: string;
  gender?: string;
  age?: number;
  address?: string;
  tribe?: string;
};

type Visit = {
  visitNumber?: string;
  status?: string;
  currentDepartment?: string;
};

type Staff = {
  name?: string;
  email?: string;
  role?: string;
};

type PaymentData = {
  _id: string;
  chargedAmount?: number;
  amountPaid?: number;
  method?: string;
  reference?: string;
  status?: string;
  note?: string;
  paidAt?: string;
  createdAt?: string;
  patient?: Patient | null;
  visit?: Visit | null;
  collectedBy?: Staff | null;
};

function humanize(value?: string) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function formatMoney(value?: number | string | null) {
  const num = Number(value || 0);
  if (!Number.isFinite(num)) return "UGX 0";
  return `UGX ${num.toLocaleString()}`;
}

function formatDate(value?: string) {
  if (!value) return "—";
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatReceiptId(id?: string) {
  if (!id) return "—";
  const short = id.slice(-8).toUpperCase();
  return `RCP-${short}`;
}

function getMethodLabel(method?: string) {
  switch (method) {
    case "cash":
      return "Cash";
    case "mobile_money":
      return "Mobile Money";
    case "bank_transfer":
      return "Bank Transfer";
    case "insurance":
      return "Insurance";
    case "other":
      return "Other";
    default:
      return humanize(method);
  }
}

function getStatusLabel(status?: string) {
  switch (status) {
    case "paid":
      return "PAID IN FULL";
    case "partial":
      return "PARTIAL PAYMENT";
    case "unpaid":
      return "UNPAID";
    default:
      return humanize(status);
  }
}

function getStatusColor(status?: string) {
  switch (status) {
    case "paid":
      return "#16a34a";
    case "partial":
      return "#b45309";
    case "unpaid":
      return "#b91c1c";
    default:
      return "#6b7280";
  }
}

export default function ReceiptScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, logout } = useContext(AuthContext);

  const [payment, setPayment] = useState<PaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canView =
    user?.role === "admin" || user?.role === "billing";

  const loadPayment = useCallback(
    async (isRefresh = false) => {
      if (!id) {
        setError("No receipt ID provided.");
        setLoading(false);
        return;
      }

      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const res = await API.get(`/payments/${id}`);
        setPayment(res.data?.payment || null);
      } catch (err: any) {
        const statusCode = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load receipt";

        if (statusCode === 401) {
          await logout();
          router.replace("/");
          return;
        }

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [id, logout, router]
  );

  useEffect(() => {
    loadPayment(false);
  }, [loadPayment]);

  const printReceipt = () => {
    if (Platform.OS === "web") {
      (globalThis as any).window?.print();
    }
  };

  if (loading) {
    return (
      <LoadingState
        title="Loading receipt..."
        subtitle="Please wait."
      />
    );
  }

  if (!canView) {
    return (
      <ErrorState
        message="Only billing staff and administrators can view receipts."
        onRetry={() => router.back()}
      />
    );
  }

  if (error && !payment) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadPayment(false)}
      />
    );
  }

  const patient = payment?.patient || {};
  const visit = payment?.visit || {};
  const collector = payment?.collectedBy || {};
  const balance = Math.max(
    Number(payment?.chargedAmount || 0) -
      Number(payment?.amountPaid || 0),
    0
  );

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadPayment(true)}
        />
      }
    >
      {/* Hospital Header */}
      <View style={styles.hospitalHeader}>
        <Text style={styles.hospitalName}>
          🏥 St. Philips Hospital
        </Text>
        <Text style={styles.hospitalSubtitle}>
          MedTrack AI — Billing Receipt
        </Text>
      </View>

      <ErrorBanner message={error} />

      {/* Receipt Card */}
      <View style={styles.receiptCard}>
        {/* Receipt Header */}
        <View style={styles.receiptHeaderRow}>
          <View>
            <Text style={styles.receiptLabel}>Receipt No.</Text>
            <Text style={styles.receiptValue}>
              {formatReceiptId(payment?._id)}
            </Text>
          </View>
          <View
            style={[
              styles.statusStamp,
              {
                borderColor: getStatusColor(payment?.status),
              },
            ]}
          >
            <Text
              style={[
                styles.statusStampText,
                {
                  color: getStatusColor(payment?.status),
                },
              ]}
            >
              {getStatusLabel(payment?.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.receiptDate}>
          Date: {formatDate(payment?.paidAt || payment?.createdAt)}
        </Text>

        <View style={styles.divider} />

        {/* Patient Info */}
        <Text style={styles.sectionTitle}>Patient Information</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Name</Text>
          <Text style={styles.infoValue}>
            {patient.name || "—"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Phone</Text>
          <Text style={styles.infoValue}>
            {patient.phone || "—"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Visit No.</Text>
          <Text style={styles.infoValue}>
            {visit.visitNumber || "—"}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Department</Text>
          <Text style={styles.infoValue}>
            {humanize(visit.currentDepartment)}
          </Text>
        </View>

        <View style={styles.divider} />

        {/* Payment Details */}
        <Text style={styles.sectionTitle}>Payment Details</Text>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Charged Amount</Text>
          <Text style={styles.infoValue}>
            {formatMoney(payment?.chargedAmount)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={[styles.infoLabel, { fontWeight: "bold" }]}>
            Amount Paid
          </Text>
          <Text
            style={[
              styles.infoValue,
              { color: "#15803d", fontWeight: "bold" },
            ]}
          >
            {formatMoney(payment?.amountPaid)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Balance</Text>
          <Text
            style={[
              styles.infoValue,
              balance > 0
                ? { color: "#b91c1c", fontWeight: "bold" }
                : { color: "#6b7280" },
            ]}
          >
            {formatMoney(balance)}
          </Text>
        </View>

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Payment Method</Text>
          <Text style={styles.infoValue}>
            {getMethodLabel(payment?.method)}
          </Text>
        </View>

        {payment?.reference ? (
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Reference</Text>
            <Text style={styles.infoValue}>
              {payment.reference}
            </Text>
          </View>
        ) : null}

        <View style={styles.infoRow}>
          <Text style={styles.infoLabel}>Collected By</Text>
          <Text style={styles.infoValue}>
            {collector.name || "—"}
          </Text>
        </View>

        {payment?.note ? (
          <>
            <View style={styles.divider} />
            <Text style={styles.noteLabel}>Note</Text>
            <Text style={styles.noteText}>{payment.note}</Text>
          </>
        ) : null}

        <View style={styles.divider} />

        {/* Footer */}
        <View style={styles.footerSection}>
          <Text style={styles.thankYou}>
            Thank you for choosing St. Philips Hospital.
          </Text>
          <Text style={styles.footerNote}>
            This is a computer-generated receipt.
          </Text>
          <Text style={styles.footerNote}>
            For inquiries, contact the billing department.
          </Text>
        </View>
      </View>

      {/* Action Buttons */}
      <View style={styles.buttonRow}>
        {Platform.OS === "web" ? (
          <TouchableOpacity
            style={styles.printButton}
            onPress={printReceipt}
          >
            <Text style={styles.printButtonText}>
              🖨️ Print Receipt
            </Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
    paddingTop: 20,
    backgroundColor: "#f3f4f6",
  },

  hospitalHeader: {
    alignItems: "center",
    marginBottom: 20,
  },

  hospitalName: {
    fontSize: 26,
    fontWeight: "bold",
    color: "#1e3a5f",
  },

  hospitalSubtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginTop: 4,
  },

  receiptCard: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    padding: 24,
    borderWidth: 1,
    borderColor: "#d1d5db",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },

  receiptHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 8,
  },

  receiptLabel: {
    fontSize: 12,
    color: "#6b7280",
  },

  receiptValue: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },

  statusStamp: {
    borderWidth: 2,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },

  statusStampText: {
    fontWeight: "bold",
    fontSize: 13,
  },

  receiptDate: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 14,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginBottom: 10,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },

  infoLabel: {
    fontSize: 14,
    color: "#6b7280",
  },

  infoValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "600",
  },

  noteLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 4,
  },

  noteText: {
    fontSize: 13,
    color: "#374151",
    fontStyle: "italic",
  },

  footerSection: {
    alignItems: "center",
    marginTop: 4,
  },

  thankYou: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#1e3a5f",
    marginBottom: 6,
  },

  footerNote: {
    fontSize: 12,
    color: "#9ca3af",
    marginBottom: 2,
  },

  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 20,
    marginBottom: 20,
  },

  printButton: {
    flex: 1,
    backgroundColor: "#1e3a5f",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  printButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 15,
  },

  backButton: {
    flex: 1,
    backgroundColor: "#e5e7eb",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  backButtonText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 15,
  },
});
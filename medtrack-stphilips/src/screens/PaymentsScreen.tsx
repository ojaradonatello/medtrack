import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
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
  _id?: string;
  visitNumber?: string;
  status?: string;
  currentDepartment?: string;
};

type Staff = {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type Payment = {
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

type Summary = {
  range?: string;
  income?: number;
  charged?: number;
  outstanding?: number;
  transactions?: number;
  averagePayment?: number;
  totalIncome?: number;
  totalCharged?: number;
  totalOutstanding?: number;
  totalTransactions?: number;
  byMethod?: Record<string, number>;
  byStatus?: Record<string, number>;
  generatedAt?: string;
};

const RANGE_FILTERS = [
  { label: "Today", value: "today" },
  { label: "7 Days", value: "7" },
  { label: "30 Days", value: "30" },
  { label: "All", value: "all" },
];

const STATUS_FILTERS = [
  { label: "All", value: "all" },
  { label: "Paid", value: "paid" },
  { label: "Partial", value: "partial" },
  { label: "Unpaid", value: "unpaid" },
];

const METHOD_FILTERS = [
  { label: "All", value: "all" },
  { label: "Cash", value: "cash" },
  { label: "Mobile Money", value: "mobile_money" },
  { label: "Bank Transfer", value: "bank_transfer" },
  { label: "Insurance", value: "insurance" },
  { label: "Other", value: "other" },
];

function humanize(value?: string) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function formatMoney(value?: number | string | null) {
  const num = Number(value || 0);

  if (!Number.isFinite(num)) {
    return "UGX 0";
  }

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

function getMethodColor(method?: string) {
  switch (method) {
    case "cash":
      return "#0891b2";
    case "mobile_money":
      return "#7c3aed";
    case "bank_transfer":
      return "#2563eb";
    case "insurance":
      return "#ca8a04";
    case "other":
      return "#6b7280";
    default:
      return "#374151";
  }
}

export default function PaymentsScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [payments, setPayments] = useState<Payment[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [range, setRange] = useState("today");
  const [status, setStatus] = useState("all");
  const [method, setMethod] = useState("all");
  const [search, setSearch] = useState("");

  const canViewPayments =
    user?.role === "admin" || user?.role === "billing";

  const loadData = useCallback(
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
        const params: any = {
          range,
          limit: 300,
        };

        if (status !== "all") {
          params.status = status;
        }

        if (method !== "all") {
          params.method = method;
        }

        const [paymentsRes, summaryRes] = await Promise.all([
          API.get("/payments", { params }),
          API.get("/payments/summary", {
            params: {
              range,
            },
          }),
        ]);

        const paymentList = Array.isArray(paymentsRes.data?.payments)
          ? paymentsRes.data.payments
          : Array.isArray(paymentsRes.data)
          ? paymentsRes.data
          : [];

        setPayments(paymentList);
        setSummary(summaryRes.data || null);
      } catch (err: any) {
        const statusCode = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load payments";

        if (statusCode === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (statusCode === 403) {
          setError(
            message ||
              "Only billing staff and administrators can access payments."
          );
          setPayments([]);
          setSummary(null);
          return;
        }

        setError(message);
        setPayments([]);
        setSummary(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [logout, method, range, router, status, user]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const filteredPayments = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return payments;
    }

    return payments.filter((payment) => {
      const patientName = payment.patient?.name?.toLowerCase() || "";
      const patientPhone = payment.patient?.phone?.toLowerCase() || "";
      const visitNumber = payment.visit?.visitNumber?.toLowerCase() || "";
      const reference = payment.reference?.toLowerCase() || "";
      const collector = payment.collectedBy?.name?.toLowerCase() || "";
      const note = payment.note?.toLowerCase() || "";

      return (
        patientName.includes(term) ||
        patientPhone.includes(term) ||
        visitNumber.includes(term) ||
        reference.includes(term) ||
        collector.includes(term) ||
        note.includes(term)
      );
    });
  }, [payments, search]);

  if (loading) {
    return (
      <LoadingState
        title="Loading payments..."
        subtitle="Please wait while income records load."
      />
    );
  }

  if (!canViewPayments) {
    return (
      <ErrorState
        message="Only billing staff and administrators can access payments."
        onRetry={() => router.replace("/")}
      />
    );
  }

  if (error && payments.length === 0) {
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
      <Text style={styles.title}>💰 Payments & Income</Text>

      <Text style={styles.subtitle}>
        Review captured patient payments, income totals, outstanding balances,
        payment methods, and billing staff collections.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <ErrorBanner message={error} />

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Date Range</Text>
      </View>

      <View style={styles.filterRow}>
        {RANGE_FILTERS.map((item) => {
          const active = range === item.value;

          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => setRange(item.value)}
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
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Income</Text>
          <Text style={[styles.summaryValue, { color: "#15803d" }]}>
            {formatMoney(summary?.income)}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Charged</Text>
          <Text style={styles.summaryValue}>
            {formatMoney(summary?.charged)}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Outstanding</Text>
          <Text
            style={[
              styles.summaryValue,
              (summary?.outstanding || 0) > 0 && { color: "#b91c1c" },
            ]}
          >
            {formatMoney(summary?.outstanding)}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Transactions</Text>
          <Text style={styles.summaryValue}>
            {summary?.transactions || 0}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Average Payment</Text>
          <Text style={styles.summaryValue}>
            {formatMoney(summary?.averagePayment)}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Income All Time</Text>
          <Text style={[styles.summaryValue, { color: "#047857" }]}>
            {formatMoney(summary?.totalIncome)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Status Breakdown</Text>

        <Text style={styles.detail}>
          Paid: {summary?.byStatus?.paid || 0}
        </Text>

        <Text style={styles.detail}>
          Partial: {summary?.byStatus?.partial || 0}
        </Text>

        <Text style={styles.detail}>
          Unpaid: {summary?.byStatus?.unpaid || 0}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Method Breakdown</Text>

        <Text style={styles.detail}>
          Cash: {formatMoney(summary?.byMethod?.cash)}
        </Text>

        <Text style={styles.detail}>
          Mobile Money:{" "}
          {formatMoney(summary?.byMethod?.mobile_money)}
        </Text>

        <Text style={styles.detail}>
          Bank Transfer:{" "}
          {formatMoney(summary?.byMethod?.bank_transfer)}
        </Text>

        <Text style={styles.detail}>
          Insurance:{" "}
          {formatMoney(summary?.byMethod?.insurance)}
        </Text>

        <Text style={styles.detail}>
          Other: {formatMoney(summary?.byMethod?.other)}
        </Text>
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Filters</Text>
      </View>

      <Text style={styles.label}>Payment Status</Text>

      <View style={styles.filterRow}>
        {STATUS_FILTERS.map((item) => {
          const active = status === item.value;

          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => setStatus(item.value)}
              style={[
                styles.smallFilterButton,
                active && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  active && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Payment Method</Text>

      <View style={styles.filterRow}>
        {METHOD_FILTERS.map((item) => {
          const active = method === item.value;

          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => setMethod(item.value)}
              style={[
                styles.smallFilterButton,
                active && styles.filterButtonActive,
              ]}
            >
              <Text
                style={[
                  styles.filterText,
                  active && styles.filterTextActive,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <Text style={styles.label}>Search</Text>

      <TextInput
        style={styles.searchInput}
        placeholder="Search patient, phone, visit, reference, staff, note"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>
          Payment Records: {filteredPayments.length}
        </Text>
      </View>

      {!error && filteredPayments.length === 0 ? (
        <EmptyState
          title="No payment records found."
          subtitle="Try another date range, status, method, or search term."
        />
      ) : null}

      {filteredPayments.map((payment) => {
        const patient = payment.patient || {};
        const visit = payment.visit || {};
        const collector = payment.collectedBy || {};

        return (
          <View key={payment._id} style={styles.paymentCard}>
            <View style={styles.paymentHeader}>
              <Text style={styles.patientName}>
                {patient.name || "Unknown Patient"}
              </Text>

              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: getStatusColor(payment.status) },
                ]}
              >
                <Text style={styles.statusText}>
                  {humanize(payment.status)}
                </Text>
              </View>
            </View>

            <Text style={styles.detail}>
              Phone: {patient.phone || "—"}
            </Text>

            <Text style={styles.detail}>
              Visit: {visit.visitNumber || "—"}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.moneyLine}>
              Charged: {formatMoney(payment.chargedAmount)}
            </Text>

            <Text
              style={[
                styles.moneyLine,
                { color: "#15803d", fontWeight: "bold" },
              ]}
            >
              Paid: {formatMoney(payment.amountPaid)}
            </Text>

            <Text
              style={[
                styles.moneyLine,
                {
                  color:
                    Number(payment.chargedAmount || 0) >
                    Number(payment.amountPaid || 0)
                      ? "#b91c1c"
                      : "#6b7280",
                },
              ]}
            >
              Balance:{" "}
              {formatMoney(
                Math.max(
                  Number(payment.chargedAmount || 0) -
                    Number(payment.amountPaid || 0),
                  0
                )
              )}
            </Text>

            <View style={styles.divider} />

            <View style={styles.badgeRow}>
              <View
                style={[
                  styles.methodBadge,
                  { backgroundColor: getMethodColor(payment.method) },
                ]}
              >
                <Text style={styles.badgeText}>
                  {humanize(payment.method)}
                </Text>
              </View>

              {payment.reference ? (
                <View style={styles.referenceBadge}>
                  <Text style={styles.referenceText}>
                    Ref: {payment.reference}
                  </Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.detail}>
              Collected by: {collector.name || "Unknown staff"}
            </Text>

            {collector.role ? (
              <Text style={styles.detail}>
                Collector role: {humanize(collector.role)}
              </Text>
            ) : null}

            <Text style={styles.time}>
              Paid at: {formatDate(payment.paidAt || payment.createdAt)}
            </Text>

            {payment.note ? (
              <Text style={styles.note}>
                Note: {payment.note}
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

  sectionLabel: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 8,
    color: "#111827",
  },

  filterRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  filterButton: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },

  smallFilterButton: {
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

  searchInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
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
    minWidth: 150,
    flexGrow: 1,
  },

  summaryLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 6,
  },

  summaryValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  paymentCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  paymentHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 8,
  },

  patientName: {
    flex: 1,
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 10,
  },

  moneyLine: {
    fontSize: 15,
    color: "#111827",
    marginBottom: 4,
  },

  badgeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },

  methodBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  badgeText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
  },

  referenceBadge: {
    backgroundColor: "#e5e7eb",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  referenceText: {
    color: "#111827",
    fontWeight: "600",
    fontSize: 12,
  },

  time: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 6,
  },

  note: {
    marginTop: 8,
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
  },
});
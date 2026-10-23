import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
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
  EmptyState,
} from "../components/StateView";

type BillingSummary = {
  totalCharged?: number;
  totalPaid?: number;
  totalBalance?: number;
  bills?: number;
};

type CollectionsSummary = {
  totalCollected?: number;
  transactions?: number;
  byMethod?: {
    cash?: number;
    mobile_money?: number;
    bank_transfer?: number;
    insurance?: number;
    other?: number;
  };
  byCollector?: CollectorRow[];
};

type OutstandingSummary = {
  totalOutstanding?: number;
  bills?: number;
};

type CollectorRow = {
  collectorId?: string;
  collectorName?: string;
  amount?: number;
  transactions?: number;
};

type BillSummaryResponse = {
  range?: string;
  generatedAt?: string;
  billing?: BillingSummary;
  collections?: CollectionsSummary;
  outstanding?: OutstandingSummary;
};

const ALLOWED_ROLES = ["admin", "billing", "pharmacist"];

const RANGE_OPTIONS = [
  { value: "today", label: "Today" },
  { value: "7", label: "Last 7 Days" },
  { value: "30", label: "Last 30 Days" },
  { value: "all", label: "All Time" },
];

const METHOD_ROWS = [
  { key: "cash", label: "Cash", icon: "💵", color: "#15803d" },
  {
    key: "mobile_money",
    label: "Mobile Money",
    icon: "📱",
    color: "#7c3aed",
  },
  {
    key: "bank_transfer",
    label: "Bank Transfer",
    icon: "🏦",
    color: "#2563eb",
  },
  { key: "insurance", label: "Insurance", icon: "🛡️", color: "#0891b2" },
  { key: "other", label: "Other", icon: "", color: "#6b7280" },
];

function formatMoney(value?: number | string | null) {
  const num = Number(value || 0);

  if (!Number.isFinite(num)) {
    return "UGX 0";
  }

  return `UGX ${num.toLocaleString()}`;
}

function formatNumber(value?: number | string | null) {
  const num = Number(value || 0);

  if (!Number.isFinite(num)) {
    return "0";
  }

  return num.toLocaleString();
}

function formatDateTime(value?: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function rangeLabel(value?: string) {
  switch (value) {
    case "today":
      return "Today";
    case "7":
      return "Last 7 Days";
    case "30":
      return "Last 30 Days";
    case "all":
      return "All Time";
    default:
      return "Today";
  }
}

export default function DailyCashierScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const allowed = ALLOWED_ROLES.includes(user?.role || "");

  const [range, setRange] = useState("today");
  const [summary, setSummary] = useState<BillSummaryResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadSummary = useCallback(
    async (selectedRange: string, isRefresh = false) => {
      if (!allowed) {
        setLoading(false);
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setError(null);

      try {
        const res = await API.get("/bills/summary", {
          params: {
            range: selectedRange,
          },
        });

        setSummary(res.data as BillSummaryResponse);
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load cashier report";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        setError(message);
        setSummary(null);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [allowed, logout, router]
  );

  useEffect(() => {
    loadSummary(range, false);
  }, [range, loadSummary]);

  if (!allowed) {
    return (
      <ErrorState
        message="You do not have permission to access the daily cashier report."
        onRetry={() => router.replace("/worklist")}
      />
    );
  }

  if (loading && !summary) {
    return (
      <LoadingState
        title="Loading cashier report..."
        subtitle="Please wait while billing and collection totals load."
      />
    );
  }

  if (error && !summary) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadSummary(range, false)}
      />
    );
  }

  const billing = summary?.billing || {};
  const collections = summary?.collections || {};
  const outstanding = summary?.outstanding || {};
  const byMethod = collections.byMethod || {};
  const byCollector = Array.isArray(collections.byCollector)
    ? collections.byCollector
    : [];

  const totalCharged = Number(billing.totalCharged || 0);
  const totalPaid = Number(billing.totalPaid || 0);
  const totalBalance = Number(billing.totalBalance || 0);
  const billsCount = Number(billing.bills || 0);

  const totalCollected = Number(collections.totalCollected || 0);
  const transactions = Number(collections.transactions || 0);
  const averageCollection =
    transactions > 0 ? totalCollected / transactions : 0;

  const outstandingTotal = Number(outstanding.totalOutstanding || 0);
  const outstandingBills = Number(outstanding.bills || 0);

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadSummary(range, true)}
        />
      }
    >
      <Text style={styles.title}>📊 Daily Cashier Report</Text>

      <Text style={styles.subtitle}>
        Review charges, collections, payment methods, outstanding balances,
        and staff accountability.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <ErrorBanner message={error} />

      <View style={styles.rangeRow}>
        {RANGE_OPTIONS.map((option) => {
          const active = range === option.value;

          return (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.rangeButton,
                active && styles.rangeButtonActive,
              ]}
              onPress={() => setRange(option.value)}
              disabled={refreshing}
            >
              <Text
                style={[
                  styles.rangeText,
                  active && styles.rangeTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.darkCard}>
        <Text style={styles.darkCardTitle}>
          Billing Summary — {rangeLabel(summary?.range || range)}
        </Text>

        <View style={styles.metricGrid}>
          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Total Charged</Text>
            <Text style={styles.metricValue}>
              {formatMoney(totalCharged)}
            </Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Total Paid</Text>
            <Text style={[styles.metricValue, { color: "#4ade80" }]}>
              {formatMoney(totalPaid)}
            </Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Outstanding</Text>
            <Text
              style={[
                styles.metricValue,
                { color: totalBalance > 0 ? "#fca5a5" : "#4ade80" },
              ]}
            >
              {formatMoney(totalBalance)}
            </Text>
          </View>

          <View style={styles.metricBox}>
            <Text style={styles.metricLabel}>Bills</Text>
            <Text style={styles.metricValue}>
              {formatNumber(billsCount)}
            </Text>
          </View>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Collections</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Collected</Text>
          <Text style={[styles.summaryValue, { color: "#15803d" }]}>
            {formatMoney(totalCollected)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Payments Recorded</Text>
          <Text style={styles.summaryValue}>
            {formatNumber(transactions)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Average per Payment</Text>
          <Text style={styles.summaryValue}>
            {formatMoney(averageCollection)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payment Methods</Text>

        {METHOD_ROWS.map((method) => {
          const amount = Number((byMethod as any)[method.key] || 0);

          return (
            <View key={method.key} style={styles.methodRow}>
              <View style={styles.methodLeft}>
                <Text style={styles.methodIcon}>{method.icon}</Text>

                <Text style={styles.methodLabel}>{method.label}</Text>
              </View>

              <Text style={[styles.methodAmount, { color: method.color }]}>
                {formatMoney(amount)}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Outstanding Balances</Text>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Total Outstanding</Text>
          <Text
            style={[
              styles.summaryValue,
              { color: outstandingTotal > 0 ? "#b91c1c" : "#15803d" },
            ]}
          >
            {formatMoney(outstandingTotal)}
          </Text>
        </View>

        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Unpaid / Partial Bills</Text>
          <Text style={styles.summaryValue}>
            {formatNumber(outstandingBills)}
          </Text>
        </View>

        <Text style={styles.helperText}>
          Outstanding balances should be followed up from the Patient Ledger
          or Billing Counter.
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Collections by Staff</Text>

        {byCollector.length === 0 ? (
          <EmptyState
            title="No collections recorded for this period."
            subtitle="Create a bill and record a payment from the Billing Counter."
          />
        ) : (
          byCollector.map((row, index) => (
            <View
              key={`${row.collectorId || row.collectorName || index}`}
              style={styles.collectorRow}
            >
              <View style={styles.collectorLeft}>
                <Text style={styles.collectorName}>
                  {row.collectorName || "Staff"}
                </Text>

                <Text style={styles.collectorMeta}>
                  {formatNumber(row.transactions || 0)} payment
                  {(Number(row.transactions || 0) === 1 ? "" : "s")}
                </Text>
              </View>

              <Text style={styles.collectorAmount}>
                {formatMoney(row.amount)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Report Generated</Text>

        <Text style={styles.footerText}>
          {formatDateTime(summary?.generatedAt)}
        </Text>

        <Text style={styles.helperText}>
          This report is designed for facility owners, cashiers, supervisors,
          and accountants to reconcile daily income and reduce billing leakage.
        </Text>
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

  rangeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  rangeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },

  rangeButtonActive: {
    backgroundColor: "#2563eb",
  },

  rangeText: {
    color: "#111827",
    fontWeight: "600",
  },

  rangeTextActive: {
    color: "#ffffff",
  },

  darkCard: {
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 14,
    marginBottom: 14,
  },

  darkCardTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 12,
  },

  metricGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  metricBox: {
    backgroundColor: "#1f2937",
    padding: 14,
    borderRadius: 12,
    minWidth: 140,
    flexGrow: 1,
  },

  metricLabel: {
    color: "#d1d5db",
    fontSize: 13,
    marginBottom: 6,
  },

  metricValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 14,
  },

  footerCard: {
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginBottom: 20,
  },

  footerTitle: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 6,
  },

  footerText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#111827",
  },

  summaryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },

  summaryValue: {
    fontSize: 15,
    color: "#111827",
    fontWeight: "bold",
  },

  methodRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },

  methodLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  methodIcon: {
    fontSize: 18,
  },

  methodLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  methodAmount: {
    fontSize: 15,
    fontWeight: "bold",
  },

  collectorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },

  collectorLeft: {
    flex: 1,
  },

  collectorName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },

  collectorMeta: {
    fontSize: 13,
    color: "#6b7280",
  },

  collectorAmount: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#15803d",
  },

  helperText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },
});
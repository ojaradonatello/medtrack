import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  TextInput,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
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

type DispenseItem = {
  _id: string;
  quantity?: number;
  createdAt?: string;
  updatedAt?: string;
  patient?: {
    _id?: string;
    name?: string;
    phone?: string;
    gender?: string;
    age?: number;
    address?: string;
  } | null;
  drug?: {
    _id?: string;
    name?: string;
    category?: string;
    manufacturer?: string;
  } | null;
  dispensedBy?: {
    _id?: string;
    name?: string;
    email?: string;
    role?: string;
  } | null;
};

const RANGE_FILTERS = [
  { label: "All", value: "all" },
  { label: "Today", value: "today" },
  { label: "7 Days", value: "7" },
  { label: "30 Days", value: "30" },
];

function formatDate(value?: string) {
  if (!value) return "No date";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function humanize(value?: string) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

export default function HistoryScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [history, setHistory] = useState<DispenseItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [range, setRange] = useState("all");
  const [search, setSearch] = useState("");

  const loadHistory = useCallback(
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
        const params: any = {};

        if (range === "today") {
          params.range = "today";
        } else if (range !== "all") {
          params.days = Number(range);
        }

        const res = await API.get("/history", { params });

        setHistory(Array.isArray(res.data) ? res.data : []);
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load history";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (status === 403) {
          setError(
            message ||
              "Only administrators can view dispensing history."
          );
          setHistory([]);
          return;
        }

        setError(message);
        setHistory([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [logout, range, router, user]
  );

  useEffect(() => {
    loadHistory(false);
  }, [loadHistory]);

  const filteredHistory = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) {
      return history;
    }

    return history.filter((item) => {
      const patientName = item.patient?.name?.toLowerCase() || "";
      const patientPhone = item.patient?.phone?.toLowerCase() || "";
      const drugName = item.drug?.name?.toLowerCase() || "";
      const staffName = item.dispensedBy?.name?.toLowerCase() || "";
      const staffEmail = item.dispensedBy?.email?.toLowerCase() || "";

      return (
        patientName.includes(term) ||
        patientPhone.includes(term) ||
        drugName.includes(term) ||
        staffName.includes(term) ||
        staffEmail.includes(term)
      );
    });
  }, [history, search]);

  const summary = useMemo(() => {
    const totalDispenses = history.length;

    const totalQuantity = history.reduce((sum, item) => {
      return sum + Number(item.quantity || 0);
    }, 0);

    const uniquePatients = new Set(
      history.map((item) => item.patient?._id).filter(Boolean)
    ).size;

    const uniqueDrugs = new Set(
      history.map((item) => item.drug?._id).filter(Boolean)
    ).size;

    return {
      totalDispenses,
      totalQuantity,
      uniquePatients,
      uniqueDrugs,
    };
  }, [history]);

  if (loading) {
    return (
      <LoadingState
        title="Loading history..."
        subtitle="Please wait while dispensing records load."
      />
    );
  }

  if (error && history.length === 0) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadHistory(false)}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadHistory(true)}
        />
      }
    >
      <Text style={styles.title}>📜 Dispensing History</Text>

      <Text style={styles.subtitle}>
        Review medication dispensed to patients, by staff, over time.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <ErrorBanner message={error} />

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Dispenses</Text>
          <Text style={styles.summaryValue}>
            {summary.totalDispenses}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Quantity</Text>
          <Text style={styles.summaryValue}>
            {summary.totalQuantity}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Unique Patients</Text>
          <Text style={styles.summaryValue}>
            {summary.uniquePatients}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Unique Drugs</Text>
          <Text style={styles.summaryValue}>
            {summary.uniqueDrugs}
          </Text>
        </View>
      </View>

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

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Search</Text>
      </View>

      <TextInput
        style={styles.searchInput}
        placeholder="Search patient, drug, phone, or staff"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
        autoCorrect={false}
      />

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>
          Records: {filteredHistory.length}
        </Text>
      </View>

      {!error && filteredHistory.length === 0 ? (
        <EmptyState
          title="No dispensing history found."
          subtitle="Try a different date range or search term."
        />
      ) : null}

      {filteredHistory.map((item) => {
        const patient = item.patient || {};
        const drug = item.drug || {};
        const staff = item.dispensedBy || {};

        return (
          <View key={item._id} style={styles.card}>
            <Text style={styles.drugName}>
              💊 {drug.name || "Unknown Drug"}
            </Text>

            <Text style={styles.detail}>
              Patient: {patient.name || "Unknown Patient"}
            </Text>

            {patient.phone ? (
              <Text style={styles.detail}>
                Phone: {patient.phone}
              </Text>
            ) : null}

            <Text style={styles.detail}>
              Quantity: {item.quantity ?? 0}
            </Text>

            <Text style={styles.detail}>
              Staff: {staff.name || "Unknown Staff"}
            </Text>

            {staff.role ? (
              <Text style={styles.detail}>
                Staff Role: {humanize(staff.role)}
              </Text>
            ) : null}

            {drug.category ? (
              <Text style={styles.detail}>
                Drug Category: {drug.category}
              </Text>
            ) : null}

            <Text style={styles.time}>
              Date: {formatDate(item.createdAt)}
            </Text>
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
    marginTop: 16,
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

  searchInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
    marginBottom: 12,
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  drugName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  time: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 6,
  },
});
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
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

type AnomalyItem = {
  id: string;
  type: string;
  message: string;
  severity?: string;
  createdAt?: string;
  isResolved?: boolean;
  raw?: any;
};

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Unresolved", value: "unresolved" },
  { label: "Resolved", value: "resolved" },
];

function humanizeType(value?: string) {
  if (!value) return "ANOMALY";
  return value.replace(/[-_]/g, " ").toUpperCase();
}

function formatDate(value?: string) {
  if (!value) return "No date";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function isPlainObject(value: any) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeAnomalies(payload: any): AnomalyItem[] {
  let list: any[] = [];

  if (Array.isArray(payload)) {
    list = payload;
  } else if (payload && Array.isArray(payload.anomalies)) {
    list = payload.anomalies;
  } else if (payload && Array.isArray(payload.alerts)) {
    list = payload.alerts;
  } else if (payload && Array.isArray(payload.data)) {
    list = payload.data;
  } else if (payload && Array.isArray(payload.items)) {
    list = payload.items;
  } else if (isPlainObject(payload)) {
    list = Object.values(payload).filter(isPlainObject);
  }

  return list.map((item, index) => {
    const id =
      item?._id ||
      item?.id ||
      `${item?.type || "anomaly"}-${index}`;

    const type =
      item?.type ||
      item?.category ||
      item?.kind ||
      "anomaly";

    const message =
      item?.message ||
      item?.description ||
      item?.title ||
      JSON.stringify(item);

    const severity =
      item?.severity ||
      item?.level ||
      item?.priority ||
      undefined;

    const createdAt =
      item?.createdAt ||
      item?.timestamp ||
      item?.date ||
      undefined;

    const isResolved =
      item?.isResolved === true ||
      item?.resolved === true;

    return {
      id: String(id),
      type: String(type),
      message: String(message),
      severity: severity ? String(severity) : undefined,
      createdAt: createdAt ? String(createdAt) : undefined,
      isResolved,
      raw: item,
    };
  });
}

function getSeverityColor(severity?: string, type?: string) {
  const value = String(severity || type || "").toLowerCase();

  if (
    value.includes("critical") ||
    value.includes("high") ||
    value.includes("anomaly") ||
    value.includes("spike") ||
    value.includes("staff")
  ) {
    return {
      background: "#fee2e2",
      text: "#991b1b",
      border: "#fecaca",
    };
  }

  if (
    value.includes("warning") ||
    value.includes("medium") ||
    value.includes("stock") ||
    value.includes("risk")
  ) {
    return {
      background: "#fef3c7",
      text: "#92400e",
      border: "#fde68a",
    };
  }

  if (
    value.includes("expiry") ||
    value.includes("low") ||
    value.includes("info")
  ) {
    return {
      background: "#ede9fe",
      text: "#5b21b6",
      border: "#ddd6fe",
    };
  }

  return {
    background: "#e0f2fe",
    text: "#075985",
    border: "#bae6fd",
  };
}

export default function AnomalyScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [anomalies, setAnomalies] = useState<AnomalyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");

  const loadAnomalies = useCallback(
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
        const res = await API.get("/anomalies");

        setAnomalies(normalizeAnomalies(res.data));
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load AI anomalies";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (status === 403) {
          setError(
            message ||
              "Only administrators can view AI anomalies."
          );
          setAnomalies([]);
          return;
        }

        setError(message);
        setAnomalies([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [logout, router, user]
  );

  useEffect(() => {
    loadAnomalies(false);
  }, [loadAnomalies]);

  const unresolvedCount = useMemo(
    () => anomalies.filter((item) => !item.isResolved).length,
    [anomalies]
  );

  const resolvedCount = useMemo(
    () => anomalies.filter((item) => item.isResolved).length,
    [anomalies]
  );

  const filteredAnomalies = useMemo(() => {
    return anomalies.filter((item) => {
      if (filter === "unresolved") return !item.isResolved;
      if (filter === "resolved") return item.isResolved;
      return true;
    });
  }, [anomalies, filter]);

  const typeSummary = useMemo(() => {
    const counts: Record<string, number> = {};

    for (const item of anomalies) {
      counts[item.type] = (counts[item.type] || 0) + 1;
    }

    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
  }, [anomalies]);

  if (loading) {
    return (
      <LoadingState
        title="Loading AI anomalies..."
        subtitle="Please wait while anomaly data loads."
      />
    );
  }

  if (error && anomalies.length === 0) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadAnomalies(false)}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadAnomalies(true)}
        />
      }
    >
      <Text style={styles.title}>🧠 AI Alerts</Text>

      <Text style={styles.subtitle}>
        System-detected anomalies, usage spikes, stock risks, expiry warnings,
        and unusual dispensing behaviour.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <ErrorBanner message={error} />

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Anomalies</Text>
          <Text style={styles.summaryValue}>{anomalies.length}</Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Unresolved</Text>
          <Text style={[styles.summaryValue, { color: "#b91c1c" }]}>
            {unresolvedCount}
          </Text>
        </View>

        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Resolved</Text>
          <Text style={[styles.summaryValue, { color: "#15803d" }]}>
            {resolvedCount}
          </Text>
        </View>
      </View>

      {typeSummary.length > 0 ? (
        <>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Top Anomaly Types</Text>
          </View>

          <View style={styles.card}>
            {typeSummary.map(([type, count]) => (
              <Text key={type} style={styles.detail}>
                {humanizeType(type)}: {count}
              </Text>
            ))}
          </View>
        </>
      ) : null}

      <View style={styles.filterRow}>
        {FILTERS.map((item) => {
          const active = filter === item.value;

          return (
            <TouchableOpacity
              key={item.value}
              onPress={() => setFilter(item.value)}
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

      {!error && filteredAnomalies.length === 0 ? (
        <EmptyState
          title="No anomalies detected for this filter."
          subtitle="Pull down to refresh or change filter."
        />
      ) : null}

      {filteredAnomalies.map((item) => {
        const colors = getSeverityColor(item.severity, item.type);

        return (
          <View
            key={item.id}
            style={[
              styles.card,
              { borderColor: colors.border },
              item.isResolved && styles.resolvedCard,
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: colors.background },
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    { color: colors.text },
                  ]}
                >
                  {humanizeType(item.type)}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  item.isResolved
                    ? styles.resolvedBadge
                    : styles.unresolvedBadge,
                ]}
              >
                <Text style={styles.statusText}>
                  {item.isResolved ? "RESOLVED" : "OPEN"}
                </Text>
              </View>
            </View>

            <Text style={styles.message}>{item.message}</Text>

            {item.severity ? (
              <Text style={styles.detail}>
                Severity: {humanizeType(item.severity)}
              </Text>
            ) : null}

            <Text style={styles.time}>
              Detected: {formatDate(item.createdAt)}
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

  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  resolvedCard: {
    backgroundColor: "#f8fafc",
    opacity: 0.9,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
    gap: 10,
  },

  typeBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  typeText: {
    fontWeight: "bold",
    fontSize: 12,
  },

  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  resolvedBadge: {
    backgroundColor: "#dcfce7",
  },

  unresolvedBadge: {
    backgroundColor: "#fee2e2",
  },

  statusText: {
    fontWeight: "bold",
    fontSize: 12,
    color: "#111827",
  },

  message: {
    fontSize: 15,
    color: "#111827",
    marginBottom: 8,
  },

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  time: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },
});
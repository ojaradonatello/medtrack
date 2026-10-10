import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
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

type HospitalAlert = {
  _id: string;
  type?: string;
  message?: string;
  isResolved?: boolean;
  createdAt?: string;
  updatedAt?: string;
};

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Unresolved", value: "unresolved" },
  { label: "Resolved", value: "resolved" },
];

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

function humanize(value?: string) {
  if (!value) return "ALERT";
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

function getTypeColor(type?: string) {
  switch (type) {
    case "anomaly":
      return "#fee2e2";
    case "low-stock":
    case "low_stock":
      return "#fef3c7";
    case "expiry":
      return "#ede9fe";
    case "warning":
      return "#ffedd5";
    default:
      return "#e0f2fe";
  }
}

function getTypeTextColor(type?: string) {
  switch (type) {
    case "anomaly":
      return "#991b1b";
    case "low-stock":
    case "low_stock":
      return "#92400e";
    case "expiry":
      return "#5b21b6";
    case "warning":
      return "#9a3412";
    default:
      return "#075985";
  }
}

export default function AlertsScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [alerts, setAlerts] = useState<HospitalAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [filter, setFilter] = useState("all");
  const [resolvingId, setResolvingId] = useState<string | null>(null);

  const loadAlerts = useCallback(
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
        const res = await API.get("/alerts");

        setAlerts(Array.isArray(res.data) ? res.data : []);
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load alerts";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (status === 403) {
          setError(
            message ||
              "Only administrators can view alerts."
          );
          setAlerts([]);
          return;
        }

        setError(message);
        setAlerts([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [logout, router, user]
  );

  useEffect(() => {
    loadAlerts(false);
  }, [loadAlerts]);

  const resolveAlert = async (alert: HospitalAlert) => {
    const doResolve = async () => {
      try {
        setResolvingId(alert._id);
        setError(null);
        setSuccess(null);

        await API.put(`/alerts/${alert._id}/resolve`);

        setSuccess("Alert resolved successfully.");

        await loadAlerts(true);
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to resolve alert";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        setError(message);
        showMessage("Resolve failed", message);
      } finally {
        setResolvingId(null);
      }
    };

    if (Platform.OS === "web") {
      const browserWindow = globalThis as any;

      const confirmed = browserWindow.confirm
        ? browserWindow.confirm("Mark this alert as resolved?")
        : true;

      if (!confirmed) {
        return;
      }

      await doResolve();
      return;
    }

    Alert.alert(
      "Resolve Alert",
      "Mark this alert as resolved?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: doResolve,
        },
      ]
    );
  };

  const unresolvedCount = useMemo(
    () => alerts.filter((alert) => !alert.isResolved).length,
    [alerts]
  );

  const resolvedCount = useMemo(
    () => alerts.filter((alert) => alert.isResolved).length,
    [alerts]
  );

  const filteredAlerts = useMemo(() => {
    return alerts.filter((alert) => {
      if (filter === "unresolved") return !alert.isResolved;
      if (filter === "resolved") return alert.isResolved;
      return true;
    });
  }, [alerts, filter]);

  if (loading) {
    return (
      <LoadingState
        title="Loading alerts..."
        subtitle="Please wait while system alerts load."
      />
    );
  }

  if (error && alerts.length === 0) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadAlerts(false)}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadAlerts(true)}
        />
      }
    >
      <Text style={styles.title}>🚨 System Alerts</Text>

      <Text style={styles.subtitle}>
        Monitor anomalies, low stock, expiry warnings, and system issues.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <View style={styles.summaryGrid}>
        <View style={styles.summaryCard}>
          <Text style={styles.summaryLabel}>Total Alerts</Text>
          <Text style={styles.summaryValue}>{alerts.length}</Text>
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

      {!error && filteredAlerts.length === 0 ? (
        <EmptyState
          title="No alerts found for this filter."
          subtitle="Pull down to refresh or change filter."
        />
      ) : null}

      {filteredAlerts.map((alert) => {
        const isResolved = alert.isResolved === true;
        const isResolving = resolvingId === alert._id;

        return (
          <View
            key={alert._id}
            style={[
              styles.card,
              isResolved && styles.resolvedCard,
            ]}
          >
            <View style={styles.cardHeader}>
              <View
                style={[
                  styles.typeBadge,
                  { backgroundColor: getTypeColor(alert.type) },
                ]}
              >
                <Text
                  style={[
                    styles.typeText,
                    { color: getTypeTextColor(alert.type) },
                  ]}
                >
                  {humanize(alert.type)}
                </Text>
              </View>

              <View
                style={[
                  styles.statusBadge,
                  isResolved
                    ? styles.resolvedBadge
                    : styles.unresolvedBadge,
                ]}
              >
                <Text style={styles.statusText}>
                  {isResolved ? "RESOLVED" : "UNRESOLVED"}
                </Text>
              </View>
            </View>

            <Text style={styles.message}>
              {alert.message || "No message"}
            </Text>

            <Text style={styles.time}>
              Created: {formatDate(alert.createdAt)}
            </Text>

            {alert.updatedAt && alert.updatedAt !== alert.createdAt ? (
              <Text style={styles.time}>
                Updated: {formatDate(alert.updatedAt)}
              </Text>
            ) : null}

            {!isResolved ? (
              <TouchableOpacity
                disabled={isResolving}
                onPress={() => resolveAlert(alert)}
                style={[
                  styles.resolveButton,
                  isResolving && styles.disabledButton,
                ]}
              >
                <Text style={styles.resolveButtonText}>
                  {isResolving ? "Resolving..." : "Mark as Resolved"}
                </Text>
              </TouchableOpacity>
            ) : (
              <Text style={styles.resolvedNote}>
                This alert has already been resolved.
              </Text>
            )}
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

  time: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
  },

  resolveButton: {
    backgroundColor: "#16a34a",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },

  resolveButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },

  disabledButton: {
    opacity: 0.6,
  },

  resolvedNote: {
    marginTop: 10,
    fontSize: 13,
    color: "#15803d",
    fontWeight: "600",
  },
});
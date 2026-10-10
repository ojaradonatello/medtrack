import React, { useCallback, useContext, useEffect, useState } from "react";
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

type Visit = {
  _id: string;
  visitNumber?: string;
  status: string;
  currentDepartment: string;
  notes?: string;
  createdAt?: string;
  startedAt?: string;
  patient?: Patient;
};

const FILTERS = [
  { label: "All", value: "all" },
  { label: "Consultation", value: "consultation" },
  { label: "Laboratory", value: "laboratory" },
  { label: "Interpretation", value: "interpretation" },
  { label: "Billing", value: "billing" },
  { label: "Dispensary", value: "dispensary" },
];

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

function getStatusColor(status: string) {
  switch (status) {
    case "waiting_consultation":
      return "#2563eb";
    case "in_consultation":
      return "#7c3aed";
    case "waiting_lab":
      return "#0891b2";
    case "lab_in_progress":
      return "#0e7490";
    case "waiting_interpretation":
      return "#b45309";
    case "waiting_billing":
      return "#ca8a04";
    case "waiting_dispensary":
      return "#16a34a";
    case "completed":
      return "#15803d";
    case "cancelled":
      return "#b91c1c";
    case "no_show":
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

export default function PatientQueueScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [visits, setVisits] = useState<Visit[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [department, setDepartment] = useState("all");
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);

  const canManageQueue =
    user?.role === "admin" || user?.role === "reception";

  const loadQueue = useCallback(
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
        const params: any = {};

        if (department !== "all") {
          params.department = department;
        }

        const res = await API.get("/reception/queue", { params });

        setVisits(Array.isArray(res.data?.queue) ? res.data.queue : []);
        setTotal(Number(res.data?.total || 0));
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load patient queue";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        setError(message);
        setVisits([]);
        setTotal(0);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [department, logout, router, user]
  );

  useEffect(() => {
    loadQueue(false);
  }, [loadQueue]);

  const moveVisit = async (
    visitId: string,
    status: "cancelled" | "no_show"
  ) => {
    if (!canManageQueue) {
      return;
    }

    const label =
      status === "cancelled" ? "Cancel Visit" : "Mark No Show";

    const note =
      status === "cancelled"
        ? "Visit cancelled by reception"
        : "Patient marked as no show by reception";

    const doMove = async () => {
      try {
        setActionLoadingId(visitId);
        setError(null);

        await API.patch(`/visits/${visitId}/move`, {
          status,
          notes: note,
        });

        showMessage("Success", `${label} completed.`);

        await loadQueue(true);
      } catch (err: any) {
        const statusCode = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to update visit";

        if (statusCode === 401) {
          await logout();
          router.replace("/");
          return;
        }

        setError(message);
        showMessage("Action failed", message);
      } finally {
        setActionLoadingId(null);
      }
    };

    if (Platform.OS === "web") {
      const browserWindow = globalThis as any;

      const confirmed = browserWindow.confirm
        ? browserWindow.confirm(`Are you sure you want to ${label}?`)
        : true;

      if (!confirmed) {
        return;
      }

      await doMove();
      return;
    }

    Alert.alert(
      "Confirm Action",
      `Are you sure you want to ${label}?`,
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Yes",
          onPress: doMove,
        },
      ]
    );
  };

  if (loading) {
    return (
      <LoadingState
        title="Loading patient queue..."
        subtitle="Please wait while active visits load."
      />
    );
  }

  if (error && visits.length === 0) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadQueue(false)}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadQueue(true)}
        />
      }
    >
      <Text style={styles.title}>🕒 Patient Queue</Text>

      <Text style={styles.subtitle}>
        Active visits currently moving through the hospital workflow.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <View style={styles.summaryCard}>
        <Text style={styles.summaryLabel}>Total Active Visits</Text>
        <Text style={styles.summaryValue}>{total}</Text>
      </View>

      <View style={styles.filterRow}>
        {FILTERS.map((filter) => {
          const active = department === filter.value;

          return (
            <TouchableOpacity
              key={filter.value}
              onPress={() => setDepartment(filter.value)}
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
                {filter.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <ErrorBanner message={error} />

      {!error && visits.length === 0 ? (
        <EmptyState
          title="No active patients in this queue."
          subtitle="Pull down to refresh or change department filter."
        />
      ) : null}

      {visits.map((visit) => {
        const patient = visit.patient || {};
        const isUpdating = actionLoadingId === visit._id;

        return (
          <View key={visit._id} style={styles.card}>
            <Text style={styles.patientName}>
              {patient.name || "Unknown Patient"}
            </Text>

            <Text style={styles.detail}>
              Phone: {patient.phone || "—"}
            </Text>

            <Text style={styles.detail}>
              Gender: {patient.gender || "—"}
            </Text>

            <Text style={styles.detail}>
              Age: {patient.age ?? "—"}
            </Text>

            <Text style={styles.detail}>
              Address: {patient.address || "—"}
            </Text>

            <View style={styles.divider} />

            <Text style={styles.detail}>
              Visit Number: {visit.visitNumber || "—"}
            </Text>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(visit.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {humanize(visit.status)}
              </Text>
            </View>

            <Text style={styles.detail}>
              Department: {humanize(visit.currentDepartment)}
            </Text>

            <Text style={styles.detail}>
              Registered: {formatDate(visit.createdAt)}
            </Text>

            {visit.notes ? (
              <Text style={styles.note}>Note: {visit.notes}</Text>
            ) : null}

            {canManageQueue ? (
              <>
                <View style={styles.divider} />

                <Text style={styles.actionTitle}>
                  Reception Actions
                </Text>

                <View style={styles.actionRow}>
                  <TouchableOpacity
                    disabled={isUpdating}
                    onPress={() => moveVisit(visit._id, "cancelled")}
                    style={[
                      styles.actionButton,
                      styles.dangerButton,
                      isUpdating && styles.disabledButton,
                    ]}
                  >
                    <Text style={styles.actionButtonText}>
                      {isUpdating ? "Updating..." : "Cancel Visit"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    disabled={isUpdating}
                    onPress={() => moveVisit(visit._id, "no_show")}
                    style={[
                      styles.actionButton,
                      styles.secondaryActionButton,
                      isUpdating && styles.disabledButton,
                    ]}
                  >
                    <Text style={styles.actionButtonText}>
                      {isUpdating ? "Updating..." : "Mark No Show"}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
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

  summaryCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  summaryLabel: {
    fontSize: 14,
    color: "#6b7280",
  },

  summaryValue: {
    fontSize: 28,
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

  patientName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 10,
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 8,
  },

  statusText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13,
  },

  note: {
    marginTop: 8,
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
  },

  actionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },

  actionRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },

  actionButton: {
    flex: 1,
    minWidth: 140,
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  dangerButton: {
    backgroundColor: "#dc2626",
  },

  secondaryActionButton: {
    backgroundColor: "#6b7280",
  },

  disabledButton: {
    opacity: 0.6,
  },

  actionButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
  },
});
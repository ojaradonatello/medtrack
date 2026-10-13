import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
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

function formatMoney(value?: number | string | null) {
  const num = Number(value || 0);

  if (!Number.isFinite(num)) {
    return "UGX 0";
  }

  return `UGX ${num.toLocaleString()}`;
}

function getStatusColor(status?: string) {
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

export default function AdminOverviewScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [data, setData] = useState<any | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const loadAdminData = useCallback(
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
        const [overviewRes, logsRes] = await Promise.all([
          API.get("/admin/overview"),
          API.get("/admin/activity-logs", {
            params: {
              limit: 20,
            },
          }),
        ]);

        setData(overviewRes.data);
        setLogs(Array.isArray(logsRes.data?.logs) ? logsRes.data.logs : []);
        setLastUpdated(new Date());
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load admin overview";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (status === 403) {
          setError(
            message ||
              "Only administrators can access this screen."
          );
          return;
        }

        setError(message);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [logout, router, user]
  );

  useEffect(() => {
    loadAdminData(false);
  }, [loadAdminData]);

  const totals = data?.totals || {};
  const workflow = data?.workflow || {};
  const usersByRole = data?.usersByRole || {};
  const inventory = data?.inventory || {};
  const alerts = data?.alerts || {};
  const payments = data?.payments || {};
  const recentVisits = Array.isArray(data?.recentVisits)
    ? data.recentVisits
    : [];

  if (loading) {
    return (
      <LoadingState
        title="Loading admin overview..."
        subtitle="Please wait while system data loads."
      />
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadAdminData(false)}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadAdminData(true)}
        />
      }
    >
      <Text style={styles.title}>🛡️ Admin Overview</Text>

      <Text style={styles.subtitle}>
        System-wide summary, income, inventory risk, audit trail, and recent activity.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "Admin"}
      </Text>

      <Text style={styles.metaText}>
        Role: {user?.role || "admin"}
      </Text>

      <Text style={styles.metaText}>
        Last updated:{" "}
        {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
      </Text>

      <Text style={styles.metaText}>
        Data generated: {formatDate(data?.generatedAt)}
      </Text>

      <ErrorBanner message={error} />

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>System Totals</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Users</Text>
          <Text style={styles.statValue}>{totals.users || 0}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Patients</Text>
          <Text style={styles.statValue}>{totals.patients || 0}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Visits</Text>
          <Text style={styles.statValue}>{totals.visits || 0}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active Visits</Text>
          <Text style={[styles.statValue, { color: "#1d4ed8" }]}>
            {totals.activeVisits || 0}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Completed Today</Text>
          <Text style={[styles.statValue, { color: "#15803d" }]}>
            {totals.completedToday || 0}
          </Text>
        </View>
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Income & Payments</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Income Today</Text>
          <Text style={[styles.statValue, { color: "#15803d" }]}>
            {formatMoney(payments.incomeToday)}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Income</Text>
          <Text style={[styles.statValue, { color: "#047857" }]}>
            {formatMoney(payments.totalIncome)}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Transactions Today</Text>
          <Text style={styles.statValue}>
            {payments.transactionsToday || 0}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Payment Records</Text>
          <Text style={styles.statValue}>
            {payments.transactions || 0}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Average Payment Today</Text>
          <Text style={styles.statValue}>
            {formatMoney(payments.averagePaymentToday)}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Waiting Billing</Text>
          <Text style={[styles.statValue, { color: "#b45309" }]}>
            {workflow.waitingBilling || 0}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionLabel}>Payment Methods Today</Text>

        <Text style={styles.detail}>
          Cash: {formatMoney(payments.byMethodToday?.cash)}
        </Text>

        <Text style={styles.detail}>
          Mobile Money:{" "}
          {formatMoney(payments.byMethodToday?.mobile_money)}
        </Text>

        <Text style={styles.detail}>
          Bank Transfer:{" "}
          {formatMoney(payments.byMethodToday?.bank_transfer)}
        </Text>

        <Text style={styles.detail}>
          Insurance:{" "}
          {formatMoney(payments.byMethodToday?.insurance)}
        </Text>

        <Text style={styles.detail}>
          Other: {formatMoney(payments.byMethodToday?.other)}
        </Text>
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Users By Role</Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.detail}>
          Admin: {usersByRole.admin || 0}
        </Text>

        <Text style={styles.detail}>
          Reception: {usersByRole.reception || 0}
        </Text>

        <Text style={styles.detail}>
          Doctor: {usersByRole.doctor || 0}
        </Text>

        <Text style={styles.detail}>
          Lab: {usersByRole.lab || 0}
        </Text>

        <Text style={styles.detail}>
          Billing: {usersByRole.billing || 0}
        </Text>

        <Text style={styles.detail}>
          Pharmacist: {usersByRole.pharmacist || 0}
        </Text>

        <Text style={styles.detail}>
          Staff: {usersByRole.staff || 0}
        </Text>
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Inventory & Alert Risk</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Drugs</Text>
          <Text style={styles.statValue}>{inventory.totalDrugs || 0}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Inventory Items</Text>
          <Text style={styles.statValue}>
            {inventory.totalInventoryItems || 0}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Stock</Text>
          <Text style={styles.statValue}>{inventory.totalStock || 0}</Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Low Stock</Text>
          <Text
            style={[
              styles.statValue,
              (inventory.lowStockCount || 0) > 0 && { color: "#b91c1c" },
            ]}
          >
            {inventory.lowStockCount || 0}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Expiring Soon / Expired</Text>
          <Text
            style={[
              styles.statValue,
              (inventory.expiringSoonCount || 0) > 0 && { color: "#b45309" },
            ]}
          >
            {inventory.expiringSoonCount || 0}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Unresolved Alerts</Text>
          <Text
            style={[
              styles.statValue,
              (alerts.unresolved || 0) > 0 && { color: "#b91c1c" },
            ]}
          >
            {alerts.unresolved || 0}
          </Text>
        </View>
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Workflow Status</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.smallStatCard}>
          <Text style={styles.statLabel}>Waiting Consultation</Text>
          <Text style={styles.smallStatValue}>
            {workflow.waitingConsultation || 0}
          </Text>
        </View>

        <View style={styles.smallStatCard}>
          <Text style={styles.statLabel}>In Consultation</Text>
          <Text style={styles.smallStatValue}>
            {workflow.inConsultation || 0}
          </Text>
        </View>

        <View style={styles.smallStatCard}>
          <Text style={styles.statLabel}>Waiting Laboratory</Text>
          <Text style={styles.smallStatValue}>
            {workflow.waitingLaboratory || 0}
          </Text>
        </View>

        <View style={styles.smallStatCard}>
          <Text style={styles.statLabel}>Lab In Progress</Text>
          <Text style={styles.smallStatValue}>
            {workflow.labInProgress || 0}
          </Text>
        </View>

        <View style={styles.smallStatCard}>
          <Text style={styles.statLabel}>Waiting Interpretation</Text>
          <Text style={styles.smallStatValue}>
            {workflow.waitingInterpretation || 0}
          </Text>
        </View>

        <View style={styles.smallStatCard}>
          <Text style={styles.statLabel}>Waiting Billing</Text>
          <Text style={styles.smallStatValue}>
            {workflow.waitingBilling || 0}
          </Text>
        </View>

        <View style={styles.smallStatCard}>
          <Text style={styles.statLabel}>Waiting Dispensary</Text>
          <Text style={styles.smallStatValue}>
            {workflow.waitingDispensary || 0}
          </Text>
        </View>
      </View>

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Recent Activity Log</Text>
      </View>

      {logs.length === 0 ? (
        <EmptyState
          title="No activity logs recorded yet."
          subtitle="Move a patient in a worklist to create an audit log."
        />
      ) : (
        logs.map((log, index) => {
          const actorName =
            log?.actor?.name ||
            log?.actor?.email ||
            "Unknown user";

          const actorRole = log?.actorRole || log?.actor?.role || "unknown";

          const patientName =
            log?.patient?.name || "Unknown patient";

          const patientPhone = log?.patient?.phone || "—";

          const visitNumber =
            log?.visit?.visitNumber || "—";

          const actionLabel = humanize(log?.action);

          const description = log?.description || "";

          const changes = log?.changes || {};

          const createdAt = formatDate(log?.createdAt);

          return (
            <View key={log?._id || index} style={styles.logCard}>
              <View style={styles.logHeader}>
                <Text style={styles.logActor}>
                  {actorName}
                </Text>

                <Text style={styles.logTime}>
                  {createdAt}
                </Text>
              </View>

              <Text style={styles.logRole}>
                Role: {humanize(actorRole)}
              </Text>

              <View
                style={[
                  styles.logActionBadge,
                  { backgroundColor: getStatusColor(log?.visit?.status) },
                ]}
              >
                <Text style={styles.logActionText}>
                  {actionLabel}
                </Text>
              </View>

              <Text style={styles.detail}>
                Patient: {patientName}
              </Text>

              <Text style={styles.detail}>
                Phone: {patientPhone}
              </Text>

              <Text style={styles.detail}>
                Visit: {visitNumber}
              </Text>

              {description ? (
                <Text style={styles.note}>
                  {description}
                </Text>
              ) : null}

              {changes.fromStatus && changes.toStatus ? (
                <Text style={styles.detail}>
                  Status: {humanize(changes.fromStatus)} →{" "}
                  {humanize(changes.toStatus)}
                </Text>
              ) : null}

              {changes.fromDepartment && changes.toDepartment ? (
                <Text style={styles.detail}>
                  Department: {humanize(changes.fromDepartment)} →{" "}
                  {humanize(changes.toDepartment)}
                </Text>
              ) : null}

              {changes.vitalsUpdated ? (
                <Text style={styles.vitalsUpdated}>
                  Vitals were updated during this action.
                </Text>
              ) : null}

              {changes.notesUpdated ? (
                <Text style={styles.notesUpdated}>
                  Notes were updated during this action.
                </Text>
              ) : null}
            </View>
          );
        })
      )}

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Recent Visits</Text>
      </View>

      {recentVisits.length === 0 ? (
        <EmptyState
          title="No visits recorded yet."
          subtitle="Register a patient from reception to create the first visit."
        />
      ) : (
        recentVisits.map((visit: any) => {
          const patient = visit.patient || {};

          return (
            <View key={visit._id} style={styles.visitCard}>
              <Text style={styles.patientName}>
                {patient.name || "Unknown Patient"}
              </Text>

              <Text style={styles.detail}>
                Phone: {patient.phone || "—"}
              </Text>

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
                Created: {formatDate(visit.createdAt)}
              </Text>

              {visit.notes ? (
                <Text style={styles.note}>
                  Note: {visit.notes}
                </Text>
              ) : null}
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
    marginBottom: 12,
  },

  metaText: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 4,
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
    marginBottom: 6,
    color: "#111827",
  },

  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  statCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minWidth: 140,
    flexGrow: 1,
  },

  smallStatCard: {
    backgroundColor: "#ffffff",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    minWidth: 140,
    flexGrow: 1,
  },

  statLabel: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 6,
  },

  statValue: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },

  smallStatValue: {
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
  },

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  note: {
    marginTop: 8,
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
  },

  logCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 6,
  },

  logActor: {
    flex: 1,
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },

  logTime: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "right",
  },

  logRole: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
  },

  logActionBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 10,
  },

  logActionText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13,
  },

  vitalsUpdated: {
    marginTop: 8,
    fontSize: 13,
    color: "#047857",
    fontWeight: "600",
  },

  notesUpdated: {
    marginTop: 4,
    fontSize: 13,
    color: "#b45309",
    fontWeight: "600",
  },

  visitCard: {
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
});
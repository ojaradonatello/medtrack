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
import { ErrorBanner, ErrorState, LoadingState } from "../components/StateView";

function formatDateTime(value) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

export default function DashboardScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const loadDashboard = useCallback(
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
        const res = await API.get("/reception/dashboard");

        setData(res.data);
        setLastUpdated(new Date());
      } catch (err) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load dashboard";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (status === 403) {
          setError(
            message ||
              "You do not have permission to view this dashboard."
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
    loadDashboard(false);
  }, [loadDashboard]);

  const totals = data || {};
  const workflow = data?.workflow || {};

  if (loading) {
    return (
      <LoadingState
        title="Loading dashboard..."
        subtitle="Please wait while reception data loads."
      />
    );
  }

  if (error && !data) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadDashboard(false)}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadDashboard(true)}
        />
      }
    >
      <Text style={styles.title}>🏠 Reception Dashboard</Text>

      <Text style={styles.subtitle}>
        Daily hospital overview for reception and front-desk operations.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"}
      </Text>

      <Text style={styles.metaText}>
        Role: {user?.role || "unknown"}
      </Text>

      <Text style={styles.metaText}>
        Last updated:{" "}
        {lastUpdated ? lastUpdated.toLocaleTimeString() : "—"}
      </Text>

      <ErrorBanner message={error} />

      <View style={styles.sectionTitleRow}>
        <Text style={styles.sectionTitle}>Today Summary</Text>
      </View>

      <View style={styles.grid}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Total Patients</Text>
          <Text style={styles.statValue}>
            {totals.totalPatients || 0}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Active Visits</Text>
          <Text style={[styles.statValue, { color: "#1d4ed8" }]}>
            {totals.totalActiveVisits || 0}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Completed Today</Text>
          <Text style={[styles.statValue, { color: "#15803d" }]}>
            {totals.completedToday || 0}
          </Text>
        </View>

        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Registered Today</Text>
          <Text style={[styles.statValue, { color: "#7c3aed" }]}>
            {totals.registeredToday || 0}
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
        <Text style={styles.sectionTitle}>Quick Actions</Text>
      </View>

      <View style={styles.quickActionGrid}>
        <TouchableOpacity
          style={styles.quickButton}
          onPress={() => router.push("/add-patient")}
        >
          <Text style={styles.quickIcon}>👤</Text>
          <Text style={styles.quickTitle}>Add Patient</Text>
          <Text style={styles.quickSubtitle}>
            Register new patient or create return visit
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickButton, styles.queueButton]}
          onPress={() => router.push("/queue")}
        >
          <Text style={styles.quickIcon}>🕒</Text>
          <Text style={styles.quickTitle}>Patient Queue</Text>
          <Text style={styles.quickSubtitle}>
            View all active patients
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.quickButton, styles.patientButton]}
          onPress={() => router.push("/patients")}
        >
          <Text style={styles.quickIcon}>👥</Text>
          <Text style={styles.quickTitle}>Patients</Text>
          <Text style={styles.quickSubtitle}>
            Search patients and view history
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.footerCard}>
        <Text style={styles.footerTitle}>Hospital Workflow</Text>

        <Text style={styles.footerText}>
          Reception registers patient, captures initial vitals, and creates visit.
        </Text>

        <Text style={styles.footerText}>
          Doctor consults, orders lab, interprets results, and routes patient.
        </Text>

        <Text style={styles.footerText}>
          Lab processes samples and sends results for interpretation.
        </Text>

        <Text style={styles.footerText}>
          Billing clears charges, then dispensary completes medication and visit.
        </Text>

        <Text style={styles.generatedAt}>
          Data generated: {formatDateTime(data?.generatedAt)}
        </Text>
      </View>
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
    fontSize: 26,
    fontWeight: "bold",
    color: "#111827",
  },

  smallStatValue: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
  },

  quickActionGrid: {
    gap: 12,
  },

  quickButton: {
    backgroundColor: "#2563eb",
    padding: 16,
    borderRadius: 12,
  },

  queueButton: {
    backgroundColor: "#111827",
  },

  patientButton: {
    backgroundColor: "#16a34a",
  },

  quickIcon: {
    fontSize: 24,
    marginBottom: 6,
  },

  quickTitle: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 4,
  },

  quickSubtitle: {
    color: "#e5e7eb",
    fontSize: 13,
  },

  footerCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginTop: 20,
    marginBottom: 20,
  },

  footerTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },

  footerText: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 6,
  },

  generatedAt: {
    marginTop: 10,
    fontSize: 12,
    color: "#6b7280",
  },
});
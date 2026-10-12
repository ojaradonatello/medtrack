import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  ActivityIndicator,
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

type Staff = {
  _id?: string;
  name?: string;
  email?: string;
  role?: string;
};

type AttendanceRecord = {
  _id: string;
  status?: "present" | "absent" | "late";
  date?: string;
  checkInAt?: string | null;
  checkOutAt?: string | null;
  staff?: Staff | null;
};

type TodayAttendance = {
  totalRecords?: number;
  presentCount?: number;
  lateCount?: number;
  checkedOutCount?: number;
  missingCount?: number;
  attendance?: AttendanceRecord[];
  missingStaff?: Staff[];
  generatedAt?: string;
};

function humanize(value?: string) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function formatDateTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function formatTime(value?: string | null) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleTimeString();
  } catch {
    return value;
  }
}

function getStatusColor(status?: string) {
  switch (status) {
    case "present":
      return "#16a34a";
    case "late":
      return "#b45309";
    case "absent":
      return "#b91c1c";
    default:
      return "#6b7280";
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

export default function AttendanceScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [myAttendance, setMyAttendance] = useState<AttendanceRecord | null>(null);
  const [today, setToday] = useState<TodayAttendance | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

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
        const requests: Promise<any>[] = [API.get("/attendance/my-today")];

        if (isAdmin) {
          requests.push(API.get("/attendance/today"));
        }

        const results = await Promise.all(requests);

        const myRes = results[0];
        const todayRes = results[1];

        setMyAttendance(myRes.data?.attendance || null);

        if (todayRes) {
          setToday(todayRes.data);
        }
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load attendance";

        if (status === 401) {
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
    [isAdmin, logout, router, user]
  );

  useEffect(() => {
    loadData(false);
  }, [loadData]);

  const checkIn = async () => {
    try {
      setActionLoading(true);
      setError(null);
      setSuccess(null);

      const res = await API.post("/attendance/check-in");

      setMyAttendance(res.data?.attendance || null);
      setSuccess(res.data?.message || "Checked in successfully.");

      if (isAdmin) {
        await loadData(true);
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to check in";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
      showMessage("Check-in failed", message);
    } finally {
      setActionLoading(false);
    }
  };

  const checkOut = async () => {
    const doIt = async () => {
      try {
        setActionLoading(true);
        setError(null);
        setSuccess(null);

        const res = await API.post("/attendance/check-out");

        setMyAttendance(res.data?.attendance || null);
        setSuccess(res.data?.message || "Checked out successfully.");

        if (isAdmin) {
          await loadData(true);
        }
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to check out";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        setError(message);
        showMessage("Check-out failed", message);
      } finally {
        setActionLoading(false);
      }
    };

    if (Platform.OS === "web") {
      const browserWindow = globalThis as any;

      const confirmed = browserWindow.confirm
        ? browserWindow.confirm("Are you sure you want to check out?")
        : true;

      if (!confirmed) {
        return;
      }

      await doIt();
      return;
    }

    Alert.alert("Check Out", "Are you sure you want to check out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Yes",
        onPress: doIt,
      },
    ]);
  };

  const myStatus = useMemo(() => {
    if (!myAttendance) {
      return {
        label: "Not checked in",
        color: "#6b7280",
        background: "#f3f4f6",
      };
    }

    if (myAttendance.checkOutAt) {
      return {
        label: "Checked out",
        color: "#1d4ed8",
        background: "#dbeafe",
      };
    }

    if (myAttendance.status === "late") {
      return {
        label: "Late",
        color: "#92400e",
        background: "#fef3c7",
      };
    }

    return {
      label: "Present",
      color: "#166534",
      background: "#dcfce7",
    };
  }, [myAttendance]);

  const canCheckIn = !myAttendance?.checkInAt || !!myAttendance?.checkOutAt;
const canCheckOut = !!myAttendance?.checkInAt && !myAttendance?.checkOutAt;

  if (loading) {
    return (
      <LoadingState
        title="Loading attendance..."
        subtitle="Please wait while attendance data loads."
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
      <Text style={styles.title}>🗓️ Attendance</Text>

      <Text style={styles.subtitle}>
        Staff check-in, check-out, and daily attendance monitoring.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <ErrorBanner message={error} />
      <SuccessBanner message={success} />

      <View style={styles.myCard}>
        <Text style={styles.sectionTitle}>My Attendance Today</Text>

        <View
          style={[
            styles.statusPill,
            { backgroundColor: myStatus.background },
          ]}
        >
          <Text style={[styles.statusPillText, { color: myStatus.color }]}>
            {myStatus.label}
          </Text>
        </View>

        <Text style={styles.detail}>
          Check-in: {formatDateTime(myAttendance?.checkInAt)}
        </Text>

        <Text style={styles.detail}>
          Check-out: {formatDateTime(myAttendance?.checkOutAt)}
        </Text>

        <Text style={styles.detail}>
          Status: {humanize(myAttendance?.status)}
        </Text>

        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.primaryButton,
              (!canCheckIn || actionLoading) && styles.disabledButton,
            ]}
            onPress={checkIn}
            disabled={!canCheckIn || actionLoading}
          >
            {actionLoading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.primaryButtonText}>Working...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Check In</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.dangerButton,
              (!canCheckOut || actionLoading) && styles.disabledButton,
            ]}
            onPress={checkOut}
            disabled={!canCheckOut || actionLoading}
          >
            {actionLoading ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator color="#fff" />
                <Text style={styles.primaryButtonText}>Working...</Text>
              </View>
            ) : (
              <Text style={styles.primaryButtonText}>Check Out</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {isAdmin ? (
        <>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Team Attendance Today</Text>
          </View>

          <View style={styles.summaryGrid}>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Total Records</Text>
              <Text style={styles.summaryValue}>
                {today?.totalRecords || 0}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Present</Text>
              <Text style={[styles.summaryValue, { color: "#15803d" }]}>
                {today?.presentCount || 0}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Late</Text>
              <Text style={[styles.summaryValue, { color: "#b45309" }]}>
                {today?.lateCount || 0}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Checked Out</Text>
              <Text style={[styles.summaryValue, { color: "#1d4ed8" }]}>
                {today?.checkedOutCount || 0}
              </Text>
            </View>

            <View style={styles.summaryCard}>
              <Text style={styles.summaryLabel}>Missing Staff</Text>
              <Text style={[styles.summaryValue, { color: "#b91c1c" }]}>
                {today?.missingCount || 0}
              </Text>
            </View>
          </View>

          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Attendance Records</Text>
          </View>

          {!today?.attendance || today.attendance.length === 0 ? (
            <EmptyState
              title="No attendance records today."
              subtitle="Staff have not checked in yet."
            />
          ) : (
            today.attendance.map((record) => {
              const staff = record.staff || {};

              return (
                <View key={record._id} style={styles.card}>
                  <Text style={styles.cardTitle}>
                    {staff.name || "Unknown Staff"}
                  </Text>

                  <Text style={styles.detail}>
                    Role: {humanize(staff.role)}
                  </Text>

                  <Text style={styles.detail}>
                    Email: {staff.email || "—"}
                  </Text>

                  <View
                    style={[
                      styles.statusPillSmall,
                      { backgroundColor: getStatusColor(record.status) },
                    ]}
                  >
                    <Text style={styles.statusPillSmallText}>
                      {humanize(record.status)}
                    </Text>
                  </View>

                  <Text style={styles.detail}>
                    Check-in: {formatTime(record.checkInAt)}
                  </Text>

                  <Text style={styles.detail}>
                    Check-out: {formatTime(record.checkOutAt)}
                  </Text>
                </View>
              );
            })
          )}

          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Missing Staff</Text>
          </View>

          {!today?.missingStaff || today.missingStaff.length === 0 ? (
            <EmptyState
              title="All expected staff have attendance records today."
              subtitle="No missing staff detected."
            />
          ) : (
            today.missingStaff.map((staff, index) => (
              <View key={staff._id || index} style={styles.missingCard}>
                <Text style={styles.cardTitle}>
                  {staff.name || "Unknown Staff"}
                </Text>

                <Text style={styles.detail}>
                  Role: {humanize(staff.role)}
                </Text>

                <Text style={styles.detail}>
                  Email: {staff.email || "—"}
                </Text>
              </View>
            ))
          )}
        </>
      ) : null}
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

  myCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  statusPill: {
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    marginBottom: 12,
  },

  statusPillText: {
    fontWeight: "bold",
    fontSize: 14,
  },

  statusPillSmall: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 8,
  },

  statusPillSmallText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
  },

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  buttonRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 12,
  },

  primaryButton: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#16a34a",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  dangerButton: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#dc2626",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
  },

  primaryButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 15,
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
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

  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  missingCard: {
    backgroundColor: "#fff1f2",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#fda4af",
  },

  cardTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#111827",
  },
});
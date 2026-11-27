import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  TextInput,
  RefreshControl,
} from "react-native";
import API from "../src/services/api";

type Tab = "pending" | "all";
type ActionKind = "reject" | "suspend";

export default function PlatformAdminScreen() {
  const [tab, setTab] = useState<Tab>("pending");
  const [stats, setStats] = useState<any>(null);
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  const [action, setAction] = useState<{
    id: string;
    name: string;
    kind: ActionKind;
  } | null>(null);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const [statsRes, listRes] = await Promise.all([
        API.get("/onboarding/stats"),
        tab === "pending"
          ? API.get("/onboarding/pending")
          : API.get("/onboarding/all"),
      ]);

      setStats(statsRes.data);
      setFacilities(listRes.data?.facilities || []);
    } catch (err: any) {
      setError(err?.response?.data?.error || "Failed to load platform data.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => {
    setLoading(true);
    load();
  }, [load]);

  const onRefresh = () => {
    setRefreshing(true);
    load();
  };

  const doApprove = async (id: string) => {
    setBusyId(id);
    setError("");
    setFlash("");
    try {
      const res = await API.post(`/onboarding/${id}/approve`, {
        subscriptionPlan: "pilot",
        trialDays: 30,
      });
      setFlash(res.data?.message || "Facility approved.");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Approve failed.");
    } finally {
      setBusyId(null);
    }
  };

  const doReactivate = async (id: string) => {
    setBusyId(id);
    setError("");
    setFlash("");
    try {
      const res = await API.post(`/onboarding/${id}/reactivate`, {});
      setFlash(res.data?.message || "Facility reactivated.");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Reactivate failed.");
    } finally {
      setBusyId(null);
    }
  };

  const submitReasonAction = async () => {
    if (!action) return;

    if (!reason.trim()) {
      setError("A reason is required.");
      return;
    }

    setBusyId(action.id);
    setError("");
    setFlash("");

    try {
      const res = await API.post(`/onboarding/${action.id}/${action.kind}`, {
        reason: reason.trim(),
      });
      setFlash(res.data?.message || "Done.");
      setAction(null);
      setReason("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Action failed.");
    } finally {
      setBusyId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" />
        <Text style={styles.muted}>Loading platform console...</Text>
      </View>
    );
  }

  const totals = stats?.totals || {};

  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageInner}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.h1}>Platform Console</Text>
      <Text style={styles.muted}>
        Facility enrollment, approvals and suspensions.
      </Text>

      <View style={styles.statRow}>
        <Stat label="Facilities" value={totals.facilities} />
        <Stat label="Pending" value={totals.pending} tone="warn" />
        <Stat label="Approved" value={totals.approved} tone="good" />
        <Stat label="Suspended" value={totals.suspended} tone="bad" />
        <Stat label="Users" value={totals.users} />
      </View>

      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, tab === "pending" && styles.tabActive]}
          onPress={() => setTab("pending")}
        >
          <Text
            style={[styles.tabText, tab === "pending" && styles.tabTextActive]}
          >
            Pending ({totals.pending ?? 0})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, tab === "all" && styles.tabActive]}
          onPress={() => setTab("all")}
        >
          <Text style={[styles.tabText, tab === "all" && styles.tabTextActive]}>
            All facilities
          </Text>
        </TouchableOpacity>
      </View>

      {flash ? <Text style={styles.flash}>{flash}</Text> : null}
      {error ? <Text style={styles.errorText}>{error}</Text> : null}

      {action ? (
        <View style={styles.actionBox}>
          <Text style={styles.actionTitle}>
            {action.kind === "reject" ? "Reject" : "Suspend"} — {action.name}
          </Text>
          <TextInput
            style={styles.input}
            value={reason}
            onChangeText={setReason}
            placeholder="Reason (required, shown to the owner)"
            multiline
          />
          <View style={styles.actionBtnRow}>
            <TouchableOpacity
              style={[styles.btn, styles.btnDanger]}
              onPress={submitReasonAction}
              disabled={busyId === action.id}
            >
              <Text style={styles.btnText}>
                Confirm {action.kind}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.btn, styles.btnGhost]}
              onPress={() => {
                setAction(null);
                setReason("");
                setError("");
              }}
            >
              <Text style={styles.btnGhostText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}

      {facilities.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.muted}>
            {tab === "pending"
              ? "No facilities awaiting approval."
              : "No facilities registered yet."}
          </Text>
        </View>
      ) : (
        facilities.map((f) => {
          const id = String(f._id || f.id);
          const status = f.enrollmentStatus || "approved";
          const busy = busyId === id;

          return (
            <View key={id} style={styles.card}>
              <View style={styles.cardHead}>
                <Text style={styles.cardTitle}>{f.name}</Text>
                <View style={[styles.badge, badgeStyle(status)]}>
                  <Text style={styles.badgeText}>{status}</Text>
                </View>
              </View>

              <Text style={styles.cardMeta}>
                {String(f.type || "").replace(/_/g, " ")} ·{" "}
                {f.town || f.district || "—"} · plan {f.subscriptionPlan || "—"}
              </Text>

              {f.ownerName ? (
                <Text style={styles.cardMeta}>
                  Owner: {f.ownerName} · {f.ownerPhone || "—"}
                </Text>
              ) : null}

              {f.ownerEmail ? (
                <Text style={styles.cardMeta}>{f.ownerEmail}</Text>
              ) : null}

              {typeof f.userCount === "number" ? (
                <Text style={styles.cardMeta}>Users: {f.userCount}</Text>
              ) : null}

              {f.rejectedReason ? (
                <Text style={styles.reasonText}>
                  Rejected: {f.rejectedReason}
                </Text>
              ) : null}

              {f.suspendedReason ? (
                <Text style={styles.reasonText}>
                  Suspended: {f.suspendedReason}
                </Text>
              ) : null}

              {busy ? (
                <ActivityIndicator style={{ marginTop: 12 }} />
              ) : (
                <View style={styles.btnRow}>
                  {status === "pending" ? (
                    <>
                      <TouchableOpacity
                        style={[styles.btn, styles.btnGood]}
                        onPress={() => doApprove(id)}
                      >
                        <Text style={styles.btnText}>Approve</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={[styles.btn, styles.btnDanger]}
                        onPress={() => {
                          setError("");
                          setFlash("");
                          setReason("");
                          setAction({ id, name: f.name, kind: "reject" });
                        }}
                      >
                        <Text style={styles.btnText}>Reject</Text>
                      </TouchableOpacity>
                    </>
                  ) : null}

                  {status === "approved" ? (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnWarn]}
                      onPress={() => {
                        setError("");
                        setFlash("");
                        setReason("");
                        setAction({ id, name: f.name, kind: "suspend" });
                      }}
                    >
                      <Text style={styles.btnText}>Suspend</Text>
                    </TouchableOpacity>
                  ) : null}

                  {status === "suspended" || status === "rejected" ? (
                    <TouchableOpacity
                      style={[styles.btn, styles.btnGood]}
                      onPress={() => doReactivate(id)}
                    >
                      <Text style={styles.btnText}>Reactivate</Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>
          );
        })
      )}
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value?: number;
  tone?: "good" | "warn" | "bad";
}) {
  const color =
    tone === "good"
      ? "#166534"
      : tone === "warn"
      ? "#92400e"
      : tone === "bad"
      ? "#b91c1c"
      : "#111827";

  return (
    <View style={styles.statCard}>
      <Text style={[styles.statValue, { color }]}>{value ?? 0}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

function badgeStyle(status: string) {
  if (status === "approved") return { backgroundColor: "#dcfce7" };
  if (status === "pending") return { backgroundColor: "#fef3c7" };
  if (status === "suspended") return { backgroundColor: "#fee2e2" };
  return { backgroundColor: "#e5e7eb" };
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f4f6" },
  pageInner: { padding: 16, paddingBottom: 40 },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  h1: { fontSize: 22, fontWeight: "700", color: "#111827" },
  muted: { fontSize: 14, color: "#6b7280", marginTop: 6 },
  statRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  statCard: {
    backgroundColor: "#fff",
    borderRadius: 10,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 96,
  },
  statValue: { fontSize: 22, fontWeight: "700" },
  statLabel: { fontSize: 11, color: "#6b7280", marginTop: 2 },
  tabRow: { flexDirection: "row", gap: 8, marginTop: 18 },
  tab: {
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },
  tabActive: { backgroundColor: "#2563eb" },
  tabText: { fontSize: 13, fontWeight: "600", color: "#374151" },
  tabTextActive: { color: "#fff" },
  flash: {
    marginTop: 14,
    backgroundColor: "#f0fdf4",
    color: "#166534",
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
  },
  errorText: {
    marginTop: 14,
    backgroundColor: "#fef2f2",
    color: "#b91c1c",
    padding: 10,
    borderRadius: 8,
    fontSize: 13,
  },
  actionBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 14,
    marginTop: 14,
    borderWidth: 1,
    borderColor: "#fca5a5",
  },
  actionTitle: { fontSize: 15, fontWeight: "700", color: "#111827" },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    padding: 10,
    marginTop: 10,
    minHeight: 60,
    fontSize: 14,
    color: "#111827",
  },
  actionBtnRow: { flexDirection: "row", gap: 8, marginTop: 12 },
  emptyBox: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 20,
    marginTop: 16,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 16,
    marginTop: 12,
  },
  cardHead: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
  },
  cardTitle: { fontSize: 16, fontWeight: "700", color: "#111827", flex: 1 },
  badge: { borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  badgeText: { fontSize: 11, fontWeight: "700", color: "#374151" },
  cardMeta: { fontSize: 13, color: "#6b7280", marginTop: 4 },
  reasonText: { fontSize: 12, color: "#b91c1c", marginTop: 6 },
  btnRow: { flexDirection: "row", gap: 8, marginTop: 14, flexWrap: "wrap" },
  btn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  btnText: { color: "#fff", fontSize: 13, fontWeight: "700" },
  btnGood: { backgroundColor: "#16a34a" },
  btnDanger: { backgroundColor: "#dc2626" },
  btnWarn: { backgroundColor: "#d97706" },
  btnGhost: { backgroundColor: "#e5e7eb" },
  btnGhostText: { color: "#374151", fontSize: 13, fontWeight: "700" },
});
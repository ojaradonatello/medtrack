import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, RefreshControl,
} from "react-native";
import { useRouter } from "expo-router";
import API from "../src/services/api";
import { AuthContext } from "../src/context/AuthContext";
import {
  TYPE_META, STATUS_META, ugx, shortDate, expiryTone, categoryLabel,
  EnrollmentType,
} from "../src/config/enrollmentConfig";

type StatusTab = "all" | "active" | "expiring" | "expired" | "cancelled";
type SortKey = "newest" | "expiry" | "name" | "paid";

const TABS: { key: StatusTab; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "expiring", label: "Expiring" },
  { key: "expired", label: "Expired" },
  { key: "cancelled", label: "Cancelled" },
];

const SORTS: { key: SortKey; label: string }[] = [
  { key: "newest", label: "Newest" },
  { key: "expiry", label: "Expiry" },
  { key: "name", label: "A–Z" },
  { key: "paid", label: "Paid" },
];

export default function EnrollmentsScreen() {
  const router = useRouter();
  const { facilityName } = useContext(AuthContext);

  const [summary, setSummary] = useState<any>(null);
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [tab, setTab] = useState<StatusTab>("all");
  const [type, setType] = useState<EnrollmentType | "all">("all");
  const [sort, setSort] = useState<SortKey>("newest");
  const [q, setQ] = useState("");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setQuery(q.trim()), 320);
    return () => clearTimeout(t);
  }, [q]);

  const load = useCallback(async () => {
    setError("");
    try {
      const params: any = { sort, limit: 300 };
      if (type !== "all") params.type = type;
      if (tab === "expiring") params.expiring = "true";
      else if (tab !== "all") params.status = tab;
      if (query) params.q = query;

      const [s, l] = await Promise.all([
        API.get("/enrollments/summary"),
        API.get("/enrollments", { params }),
      ]);
      setSummary(s.data);
      setRows(l.data?.enrollments || []);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Could not load enrollments.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab, type, sort, query]);

  useEffect(() => { setLoading(true); load(); }, [load]);

  const visible = useMemo(() => rows, [rows]);

  if (loading) {
    return (
      <View style={s.center}>
        <ActivityIndicator size="large" color="#0d9488" />
        <Text style={s.muted}>Loading enrollment register…</Text>
      </View>
    );
  }

  return (
    <View style={s.root}>
      <ScrollView
        contentContainerStyle={s.page}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0d9488" />
        }
      >
        <View style={s.hero}>
          <View style={s.heroGlowA} />
          <View style={s.heroGlowB} />
          <Text style={s.heroKicker}>{facilityName || "MedTrack"}</Text>
          <Text style={s.heroTitle}>Enrollment Register</Text>
          <Text style={s.heroSub}>
            Insurance · Programs · Memberships · Donor schemes
          </Text>

          <View style={s.statGrid}>
            <Stat label="Active" value={summary?.active} color="#4ade80" />
            <Stat label="Expiring ≤30d" value={summary?.expiringSoon} color="#fbbf24" />
            <Stat label="Expired" value={summary?.expired} color="#f87171" />
            <Stat label="Collected" value={ugx(summary?.totalCollected)} color="#67e8f9" small />
          </View>

          <TouchableOpacity style={s.heroBtn} onPress={() => router.push("/enroll-patient")} activeOpacity={0.85}>
            <Text style={s.heroBtnText}>＋  Enroll a patient</Text>
          </TouchableOpacity>
        </View>

        <View style={s.typeRow}>
          <TypeChip label="All types" icon="◈" active={type === "all"} color="#0f172a" onPress={() => setType("all")} count={summary?.active} />
          {(Object.keys(TYPE_META) as EnrollmentType[]).map((k) => (
            <TypeChip
              key={k}
              label={TYPE_META[k].label}
              icon={TYPE_META[k].icon}
              color={TYPE_META[k].color}
              active={type === k}
              count={summary?.byType?.[k] ?? 0}
              onPress={() => setType(type === k ? "all" : k)}
            />
          ))}
        </View>

        <View style={s.searchBox}>
          <Text style={s.searchIcon}>⌕</Text>
          <TextInput
            style={s.searchInput}
            value={q}
            onChangeText={setQ}
            placeholder="Search patient, phone, plan or enrollment no."
            placeholderTextColor="#94a3b8"
          />
          {q ? (
            <TouchableOpacity onPress={() => setQ("")}><Text style={s.clear}>✕</Text></TouchableOpacity>
          ) : null}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabScroll}>
          <View style={s.tabRow}>
            {TABS.map((t) => (
              <TouchableOpacity key={t.key} style={[s.tab, tab === t.key && s.tabOn]} onPress={() => setTab(t.key)}>
                <Text style={[s.tabText, tab === t.key && s.tabTextOn]}>{t.label}</Text>
              </TouchableOpacity>
            ))}
            <View style={s.tabDivider} />
            {SORTS.map((v) => (
              <TouchableOpacity key={v.key} style={[s.sortPill, sort === v.key && s.sortPillOn]} onPress={() => setSort(v.key)}>
                <Text style={[s.sortText, sort === v.key && s.sortTextOn]}>{v.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>

        {error ? <Text style={s.error}>{error}</Text> : null}

        <Text style={s.resultCount}>
          {visible.length} enrollment{visible.length === 1 ? "" : "s"}
          {query ? ` matching “${query}”` : ""}
        </Text>

        {visible.length === 0 ? (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🗂️</Text>
            <Text style={s.emptyTitle}>Nothing here yet</Text>
            <Text style={s.emptyText}>
              {query || tab !== "all" || type !== "all"
                ? "No enrollments match these filters. Try clearing them."
                : "Enroll your first patient into an insurance scheme, care program, membership or donor fund."}
            </Text>
            {query || tab !== "all" || type !== "all" ? (
              <TouchableOpacity style={s.emptyBtn} onPress={() => { setQ(""); setTab("all"); setType("all"); }}>
                <Text style={s.emptyBtnText}>Clear filters</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={s.emptyBtn} onPress={() => router.push("/enroll-patient")}>
                <Text style={s.emptyBtnText}>Enroll a patient</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          visible.map((e) => <Card key={e._id} e={e} onPress={() => router.push({ pathname: "/enrollment-detail", params: { id: e._id } })} />)
        )}

        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
}

function Stat({ label, value, color, small }: any) {
  return (
    <View style={s.statCard}>
      <Text style={[s.statValue, { color }, small && { fontSize: 15 }]} numberOfLines={1}>
        {value ?? 0}
      </Text>
      <Text style={s.statLabel}>{label}</Text>
    </View>
  );
}

function TypeChip({ label, icon, color, active, count, onPress }: any) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[s.typeChip, active ? { backgroundColor: color, borderColor: color } : { borderColor: color + "44" }]}
    >
      <Text style={s.typeChipIcon}>{icon}</Text>
      <Text style={[s.typeChipLabel, active && { color: "#fff" }]} numberOfLines={1}>{label}</Text>
      <View style={[s.typeChipCount, active && { backgroundColor: "#ffffff33" }]}>
        <Text style={[s.typeChipCountText, active && { color: "#fff" }]}>{count ?? 0}</Text>
      </View>
    </TouchableOpacity>
  );
}

function Card({ e, onPress }: any) {
  const meta = TYPE_META[e.type as EnrollmentType] || TYPE_META.program;
  const st = STATUS_META[e.status as keyof typeof STATUS_META] || STATUS_META.active;
  const tone = expiryTone(e.expiryDate);
  const paid = Number(e.totalPaid || 0);
  const fee = Number(e.monthlyFee || 0);

  return (
    <TouchableOpacity style={[s.card, { borderLeftColor: meta.color }]} onPress={onPress} activeOpacity={0.85}>
      <View style={[s.cardBand, { backgroundColor: meta.color }]}>
        <View style={[s.cardOrb, { backgroundColor: meta.deep }]} />
        <Text style={s.cardBandIcon}>{meta.icon}</Text>
        <Text style={s.cardBandLabel}>{meta.label}</Text>
        <View style={[s.statusPill, { backgroundColor: st.soft }]}>
          <View style={[s.statusDot, { backgroundColor: st.color }]} />
          <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
        </View>
      </View>

      <View style={s.cardBody}>
        <Text style={s.cardName} numberOfLines={1}>{e.patient?.name || "Unknown patient"}</Text>
        <Text style={s.cardProgram} numberOfLines={1}>{e.programName}</Text>

        <View style={s.cardMetaRow}>
          <Text style={s.cardNumber}>{e.enrollmentNumber || "—"}</Text>
          {e.programCategory ? (
            <>
              <Text style={s.dotSep}>·</Text>
              <Text style={s.cardMeta}>{categoryLabel(e.programCategory)}</Text>
            </>
          ) : null}
          {e.patient?.phone ? (
            <>
              <Text style={s.dotSep}>·</Text>
              <Text style={s.cardMeta}>{e.patient.phone}</Text>
            </>
          ) : null}
        </View>

        <View style={s.cardFoot}>
          <View style={[s.expiryPill, { backgroundColor: tone.soft }]}>
            <Text style={[s.expiryText, { color: tone.color }]}>
              {shortDate(e.expiryDate)} · {tone.text}
            </Text>
          </View>
          {fee > 0 || paid > 0 ? (
            <Text style={s.cardMoney}>
              {ugx(paid)}{fee > 0 ? ` / ${ugx(fee)} mo` : ""}
            </Text>
          ) : (
            <Text style={s.cardFree}>No fee</Text>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f1f5f9" },
  muted: { color: "#64748b", marginTop: 10, fontSize: 14 },
  page: { padding: 14, paddingBottom: 30 },

  hero: { backgroundColor: "#0f172a", borderRadius: 18, padding: 20, overflow: "hidden" },
  heroGlowA: { position: "absolute", width: 240, height: 240, borderRadius: 120, backgroundColor: "#0d9488", opacity: 0.35, top: -110, right: -60 },
  heroGlowB: { position: "absolute", width: 180, height: 180, borderRadius: 90, backgroundColor: "#6366f1", opacity: 0.3, bottom: -90, left: -40 },
  heroKicker: { color: "#5eead4", fontSize: 11, fontWeight: "800", letterSpacing: 1.2, textTransform: "uppercase" },
  heroTitle: { color: "#fff", fontSize: 26, fontWeight: "800", marginTop: 6 },
  heroSub: { color: "#94a3b8", fontSize: 12.5, marginTop: 4 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 18 },
  statCard: { backgroundColor: "#ffffff14", borderRadius: 12, paddingVertical: 11, paddingHorizontal: 14, minWidth: 92, flexGrow: 1 },
  statValue: { fontSize: 23, fontWeight: "800" },
  statLabel: { color: "#cbd5e1", fontSize: 10.5, marginTop: 3, fontWeight: "600" },
  heroBtn: { backgroundColor: "#14b8a6", borderRadius: 11, paddingVertical: 13, alignItems: "center", marginTop: 16 },
  heroBtnText: { color: "#042f2e", fontSize: 15, fontWeight: "800" },

  typeRow: { flexDirection: "row", flexWrap: "wrap", gap: 7, marginTop: 14 },
  typeChip: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1.5, borderRadius: 30, paddingVertical: 7, paddingHorizontal: 11, backgroundColor: "#fff" },
  typeChipIcon: { fontSize: 13 },
  typeChipLabel: { fontSize: 12, fontWeight: "700", color: "#334155", maxWidth: 108 },
  typeChipCount: { backgroundColor: "#f1f5f9", borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  typeChipCountText: { fontSize: 10.5, fontWeight: "800", color: "#475569" },

  searchBox: { flexDirection: "row", alignItems: "center", gap: 8, backgroundColor: "#fff", borderRadius: 12, paddingHorizontal: 13, marginTop: 12, borderWidth: 1, borderColor: "#e2e8f0" },
  searchIcon: { fontSize: 19, color: "#0d9488", fontWeight: "700" },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14.5, color: "#0f172a" },
  clear: { fontSize: 15, color: "#94a3b8", paddingHorizontal: 4 },

  tabScroll: { marginTop: 12 },
  tabRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  tab: { paddingVertical: 8, paddingHorizontal: 14, borderRadius: 9, backgroundColor: "#e2e8f0" },
  tabOn: { backgroundColor: "#0f172a" },
  tabText: { fontSize: 12.5, fontWeight: "700", color: "#475569" },
  tabTextOn: { color: "#5eead4" },
  tabDivider: { width: 1, height: 20, backgroundColor: "#cbd5e1", marginHorizontal: 4 },
  sortPill: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 9, borderWidth: 1, borderColor: "#cbd5e1" },
  sortPillOn: { borderColor: "#0d9488", backgroundColor: "#ccfbf1" },
  sortText: { fontSize: 12, fontWeight: "700", color: "#64748b" },
  sortTextOn: { color: "#0f766e" },

  error: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: 12, borderRadius: 10, marginTop: 12, fontSize: 13 },
  resultCount: { color: "#64748b", fontSize: 12, fontWeight: "600", marginTop: 14, marginBottom: 8 },

  empty: { backgroundColor: "#fff", borderRadius: 16, padding: 28, alignItems: "center", borderWidth: 1, borderColor: "#e2e8f0" },
  emptyIcon: { fontSize: 40 },
  emptyTitle: { fontSize: 17, fontWeight: "800", color: "#0f172a", marginTop: 10 },
  emptyText: { fontSize: 13, color: "#64748b", textAlign: "center", marginTop: 6, lineHeight: 19 },
  emptyBtn: { backgroundColor: "#0d9488", borderRadius: 10, paddingVertical: 11, paddingHorizontal: 22, marginTop: 16 },
  emptyBtnText: { color: "#fff", fontWeight: "800", fontSize: 13.5 },

  card: { backgroundColor: "#fff", borderRadius: 14, marginBottom: 11, overflow: "hidden", borderLeftWidth: 5, shadowColor: "#0f172a", shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 2 },
  cardBand: { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 13, paddingVertical: 9, overflow: "hidden" },
  cardOrb: { position: "absolute", width: 90, height: 90, borderRadius: 45, opacity: 0.45, right: -25, top: -40 },
  cardBandIcon: { fontSize: 14 },
  cardBandLabel: { flex: 1, color: "#fff", fontSize: 11.5, fontWeight: "800", letterSpacing: 0.6, textTransform: "uppercase" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 9, paddingVertical: 3 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10.5, fontWeight: "800" },
  cardBody: { padding: 14 },
  cardName: { fontSize: 17.5, fontWeight: "800", color: "#0f172a" },
  cardProgram: { fontSize: 13.5, color: "#475569", marginTop: 2, fontWeight: "600" },
  cardMetaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 5, marginTop: 8 },
  cardNumber: { fontSize: 11, color: "#0f766e", fontWeight: "800", letterSpacing: 0.7 },
  cardMeta: { fontSize: 11.5, color: "#94a3b8" },
  dotSep: { color: "#cbd5e1", fontSize: 11 },
  cardFoot: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 12, flexWrap: "wrap" },
  expiryPill: { borderRadius: 7, paddingHorizontal: 9, paddingVertical: 5 },
  expiryText: { fontSize: 11.5, fontWeight: "700" },
  cardMoney: { fontSize: 12.5, fontWeight: "800", color: "#0f172a" },
  cardFree: { fontSize: 11.5, color: "#94a3b8", fontWeight: "600" },
});
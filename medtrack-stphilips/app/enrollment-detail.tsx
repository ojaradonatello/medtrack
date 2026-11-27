import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, Platform, Share, RefreshControl,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import API from "../src/services/api";
import { AuthContext } from "../src/context/AuthContext";
import {
  TYPE_META, STATUS_META, METHODS, ugx, shortDate, longDateTime,
  expiryTone, categoryLabel, methodLabel, EnrollmentType,
} from "../src/config/enrollmentConfig";

type Panel = "none" | "pay" | "renew" | "cancel" | "edit";

export default function EnrollmentDetailScreen() {
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { facilityName, receiptHeader, user } = useContext(AuthContext);

  const [e, setE] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");
  const [panel, setPanel] = useState<Panel>("none");

  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("cash");
  const [reference, setReference] = useState("");
  const [months, setMonths] = useState(12);
  const [reason, setReason] = useState("");
  const [editName, setEditName] = useState("");
  const [editBenefits, setEditBenefits] = useState("");
  const [editNotes, setEditNotes] = useState("");
  const [editExpiry, setEditExpiry] = useState("");
  const [editFee, setEditFee] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const res = await API.get(`/enrollments/${id}`);
      const en = res.data?.enrollment;
      setE(en);
      setEditName(en?.programName || "");
      setEditBenefits(en?.benefits || "");
      setEditNotes(en?.notes || "");
      setEditExpiry(en?.expiryDate ? String(en.expiryDate).slice(0, 10) : "");
      setEditFee(String(en?.monthlyFee || 0));
    } catch (err: any) {
      setError(err?.response?.data?.error || "Could not load this enrollment.");
    } finally { setLoading(false); setRefreshing(false); }
  }, [id]);

  useEffect(() => { load(); }, [load]);

  const run = async (fn: () => Promise<any>, ok: string) => {
    setBusy(true); setError(""); setFlash("");
    try {
      const res = await fn();
      setFlash(res?.data?.message || ok);
      setPanel("none"); setAmount(""); setReference(""); setReason("");
      await load();
    } catch (err: any) {
      setError(err?.response?.data?.error || "Action failed.");
    } finally { setBusy(false); }
  };

  const buildText = () => {
    const m = TYPE_META[e.type as EnrollmentType];
    return [
      `${receiptHeader || facilityName || "MEDTRACK"}`,
      `ENROLLMENT CONFIRMATION`,
      ``,
      `Enrollment No: ${e.enrollmentNumber}`,
      `Patient: ${e.patient?.name}`,
      `Phone: ${e.patient?.phone || "—"}`,
      `Type: ${m.label}`,
      `Plan: ${e.programName}`,
      e.programCategory ? `Category: ${categoryLabel(e.programCategory)}` : "",
      `Valid: ${shortDate(e.enrollmentDate)} → ${shortDate(e.expiryDate)}`,
      `Status: ${e.status.toUpperCase()}`,
      e.monthlyFee ? `Monthly fee: ${ugx(e.monthlyFee)}` : "",
      `Total paid: ${ugx(e.totalPaid)}`,
      e.benefits ? `Benefits: ${e.benefits}` : "",
      e.donorName ? `Donor: ${e.donorName}` : "",
      ``,
      `Issued by ${e.enrolledByName || "Staff"} · ${longDateTime(e.createdAt)}`,
    ].filter(Boolean).join("\n");
  };

  const printCard = () => {
    const m = TYPE_META[e.type as EnrollmentType];
    if (Platform.OS === "web") {
      const w = (globalThis as any).open?.("", "_blank", "width=760,height=900");
      if (!w) { setError("Allow pop-ups to print."); return; }
      const rows = (e.payments || []).map((p: any) =>
        `<tr><td>${shortDate(p.paidAt)}</td><td>${methodLabel(p.method)}</td><td>${p.reference || "—"}</td><td class="r">${ugx(p.amount)}</td></tr>`
      ).join("");
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${e.enrollmentNumber}</title>
<style>
*{box-sizing:border-box}body{font-family:ui-sans-serif,system-ui,-apple-system,Segoe UI,Roboto,sans-serif;margin:0;padding:34px;background:#f1f5f9;color:#0f172a}
.sheet{max-width:660px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 12px 40px rgba(15,23,42,.14)}
.band{background:${m.color};padding:22px 26px;color:#fff;position:relative;overflow:hidden}
.band:after{content:"";position:absolute;width:190px;height:190px;border-radius:95px;background:${m.deep};opacity:.5;right:-50px;top:-90px}
.fac{font-size:11px;letter-spacing:2.4px;text-transform:uppercase;opacity:.9;font-weight:800}
.kind{font-size:22px;font-weight:800;margin-top:6px;position:relative}
.body{padding:26px}
.name{font-size:27px;font-weight:800;letter-spacing:-.4px}
.plan{font-size:15px;color:#475569;margin-top:3px;font-weight:600}
.num{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;letter-spacing:2px;color:${m.ink};background:${m.soft};display:inline-block;padding:6px 12px;border-radius:7px;margin-top:14px;font-weight:700}
.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:20px}
.cell{background:#f8fafc;border-radius:10px;padding:12px 14px;border-left:3px solid ${m.color}}
.k{font-size:10px;text-transform:uppercase;letter-spacing:1.1px;color:#94a3b8;font-weight:800}
.v{font-size:14.5px;font-weight:700;margin-top:4px}
.ben{margin-top:18px;background:${m.soft};border-radius:10px;padding:14px;font-size:13px;line-height:1.6;color:${m.ink}}
table{width:100%;border-collapse:collapse;margin-top:18px;font-size:12.5px}
th{text-align:left;font-size:10px;letter-spacing:1px;text-transform:uppercase;color:#94a3b8;padding:8px 6px;border-bottom:2px solid #e2e8f0}
td{padding:9px 6px;border-bottom:1px solid #f1f5f9}
.r{text-align:right;font-weight:700}
.foot{margin-top:24px;padding-top:16px;border-top:1px dashed #cbd5e1;font-size:11px;color:#94a3b8;display:flex;justify-content:space-between}
h3{font-size:11px;letter-spacing:1.2px;text-transform:uppercase;color:#64748b;margin:22px 0 0}
@media print{body{background:#fff;padding:0}.sheet{box-shadow:none;border-radius:0}}
</style></head><body><div class="sheet">
<div class="band"><div class="fac">${receiptHeader || facilityName || "MEDTRACK"}</div><div class="kind">${m.icon} ${m.label}</div></div>
<div class="body">
<div class="name">${e.patient?.name || ""}</div>
<div class="plan">${e.programName}${e.programCategory ? " · " + categoryLabel(e.programCategory) : ""}</div>
<div class="num">${e.enrollmentNumber}</div>
<div class="grid">
<div class="cell"><div class="k">Valid from</div><div class="v">${shortDate(e.enrollmentDate)}</div></div>
<div class="cell"><div class="k">Valid until</div><div class="v">${shortDate(e.expiryDate)}</div></div>
<div class="cell"><div class="k">Status</div><div class="v">${String(e.status).toUpperCase()}</div></div>
<div class="cell"><div class="k">Total paid</div><div class="v">${ugx(e.totalPaid)}</div></div>
${e.monthlyFee ? `<div class="cell"><div class="k">Monthly fee</div><div class="v">${ugx(e.monthlyFee)}</div></div>` : ""}
${e.patient?.phone ? `<div class="cell"><div class="k">Phone</div><div class="v">${e.patient.phone}</div></div>` : ""}
${e.donorName ? `<div class="cell"><div class="k">Donor</div><div class="v">${e.donorName}</div></div>` : ""}
${e.nextVisit ? `<div class="cell"><div class="k">Next visit</div><div class="v">${shortDate(e.nextVisit)}</div></div>` : ""}
</div>
${e.benefits ? `<div class="ben"><strong>BENEFITS</strong><br>${e.benefits}</div>` : ""}
${rows ? `<h3>Payment history</h3><table><thead><tr><th>Date</th><th>Method</th><th>Reference</th><th class="r">Amount</th></tr></thead><tbody>${rows}</tbody></table>` : ""}
<div class="foot"><span>Issued by ${e.enrolledByName || "Staff"} · ${longDateTime(e.createdAt)}</span><span>Printed ${longDateTime(new Date())}</span></div>
</div></div><script>setTimeout(function(){window.print()},350)</script></body></html>`);
      w.document.close();
      return;
    }
    Share.share({ message: buildText(), title: `Enrollment ${e.enrollmentNumber}` })
      .catch(() => setError("Sharing is unavailable on this device."));
  };

  if (loading) {
    return <View style={s.center}><ActivityIndicator size="large" color="#0d9488" /><Text style={s.muted}>Opening enrollment…</Text></View>;
  }

  if (!e) {
    return (
      <View style={s.center}>
        <Text style={s.errIcon}>⚠️</Text>
        <Text style={s.errTitle}>Enrollment unavailable</Text>
        <Text style={s.muted}>{error}</Text>
        <TouchableOpacity style={s.backBtn} onPress={() => router.replace("/enrollments")}><Text style={s.backBtnText}>Back to register</Text></TouchableOpacity>
      </View>
    );
  }

  const m = TYPE_META[e.type as EnrollmentType];
  const st = STATUS_META[e.status as keyof typeof STATUS_META];
  const tone = expiryTone(e.expiryDate);
  const cancelled = e.status === "cancelled";
  const canMoney = ["admin", "billing", "reception"].includes(user?.role);
  const canWrite = ["admin", "reception", "billing"].includes(user?.role);

  return (
    <ScrollView
      style={s.root} contentContainerStyle={s.page}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); load(); }} tintColor="#0d9488" />}
    >
      <View style={[s.card, { borderColor: m.color }]}>
        <View style={[s.band, { backgroundColor: m.color }]}>
          <View style={[s.orb, { backgroundColor: m.deep }]} />
          <View style={[s.orb2, { backgroundColor: m.deep }]} />
          <Text style={s.bandFac}>{facilityName || "MedTrack"}</Text>
          <View style={s.bandRow}>
            <Text style={s.bandIcon}>{m.icon}</Text>
            <Text style={s.bandKind}>{m.label}</Text>
            <View style={[s.statusPill, { backgroundColor: st.soft }]}>
              <View style={[s.statusDot, { backgroundColor: st.color }]} />
              <Text style={[s.statusText, { color: st.color }]}>{st.label}</Text>
            </View>
          </View>
        </View>

        <View style={s.cardBody}>
          <Text style={s.name}>{e.patient?.name}</Text>
          <Text style={s.plan}>{e.programName}</Text>
          <View style={[s.numBox, { backgroundColor: m.soft }]}>
            <Text style={[s.num, { color: m.ink }]}>{e.enrollmentNumber}</Text>
          </View>

          <View style={s.grid}>
            <Cell k="Valid from" v={shortDate(e.enrollmentDate)} color={m.color} />
            <Cell k="Valid until" v={shortDate(e.expiryDate)} color={m.color} />
            <Cell k="Time left" v={tone.text} color={tone.color} />
            <Cell k="Total paid" v={ugx(e.totalPaid)} color={m.color} />
            {e.monthlyFee ? <Cell k="Monthly fee" v={ugx(e.monthlyFee)} color={m.color} /> : null}
            {e.programCategory ? <Cell k="Category" v={categoryLabel(e.programCategory)} color={m.color} /> : null}
            {e.patient?.phone ? <Cell k="Phone" v={e.patient.phone} color={m.color} /> : null}
            {e.nextVisit ? <Cell k="Next visit" v={shortDate(e.nextVisit)} color={m.color} /> : null}
            {e.donorName ? <Cell k="Donor" v={e.donorName} color={m.color} /> : null}
            {e.donorReference ? <Cell k="Donor ref" v={e.donorReference} color={m.color} /> : null}
          </View>

          {e.diagnosis ? <View style={s.noteBox}><Text style={s.noteKey}>Clinical note</Text><Text style={s.noteVal}>{e.diagnosis}</Text></View> : null}
          {e.benefits ? <View style={[s.noteBox, { backgroundColor: m.soft }]}><Text style={[s.noteKey, { color: m.ink }]}>Benefits</Text><Text style={[s.noteVal, { color: m.ink }]}>{e.benefits}</Text></View> : null}
          {e.notes ? <View style={s.noteBox}><Text style={s.noteKey}>Internal notes</Text><Text style={s.noteVal}>{e.notes}</Text></View> : null}
          {cancelled ? <View style={[s.noteBox, { backgroundColor: "#fee2e2" }]}><Text style={[s.noteKey, { color: "#b91c1c" }]}>Cancelled {shortDate(e.cancelledAt)}</Text><Text style={[s.noteVal, { color: "#b91c1c" }]}>{e.cancelReason}</Text></View> : null}
        </View>
      </View>

      {flash ? <Text style={s.flash}>{flash}</Text> : null}
      {error ? <Text style={s.error}>{error}</Text> : null}

      <View style={s.actions}>
        <TouchableOpacity style={[s.act, { backgroundColor: m.color }]} onPress={printCard}>
          <Text style={s.actText}>{Platform.OS === "web" ? "🖨  Print card" : "↗  Share card"}</Text>
        </TouchableOpacity>
        {!cancelled && canMoney ? (
          <TouchableOpacity style={[s.act, s.actOutline]} onPress={() => { setPanel(panel === "pay" ? "none" : "pay"); setError(""); }}>
            <Text style={[s.actText, { color: "#0f172a" }]}>💵  Add payment</Text>
          </TouchableOpacity>
        ) : null}
        {!cancelled && canMoney ? (
          <TouchableOpacity style={[s.act, s.actOutline]} onPress={() => { setPanel(panel === "renew" ? "none" : "renew"); setError(""); }}>
            <Text style={[s.actText, { color: "#0f172a" }]}>↻  Renew</Text>
          </TouchableOpacity>
        ) : null}
        {!cancelled && canWrite ? (
          <TouchableOpacity style={[s.act, s.actOutline]} onPress={() => { setPanel(panel === "edit" ? "none" : "edit"); setError(""); }}>
            <Text style={[s.actText, { color: "#0f172a" }]}>✎  Edit</Text>
          </TouchableOpacity>
        ) : null}
        {!cancelled && canWrite ? (
          <TouchableOpacity style={[s.act, { backgroundColor: "#fee2e2" }]} onPress={() => { setPanel(panel === "cancel" ? "none" : "cancel"); setError(""); }}>
            <Text style={[s.actText, { color: "#b91c1c" }]}>✕  Cancel</Text>
          </TouchableOpacity>
        ) : null}
      </View>

      {panel === "pay" ? (
        <View style={s.panel}>
          <Text style={s.panelTitle}>Record a payment</Text>
          <Text style={s.label}>Amount (UGX)</Text>
          <TextInput style={s.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" placeholderTextColor="#94a3b8" />
          {e.monthlyFee ? (
            <View style={s.chips}>
              {[1, 3, 6, 12].map((n) => (
                <TouchableOpacity key={n} style={[s.chip, Number(amount) === e.monthlyFee * n && { backgroundColor: m.color, borderColor: m.color }]} onPress={() => setAmount(String(e.monthlyFee * n))}>
                  <Text style={[s.chipText, Number(amount) === e.monthlyFee * n && { color: "#fff" }]}>{n} mo · {ugx(e.monthlyFee * n)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}
          <Text style={s.label}>Method</Text>
          <View style={s.chips}>
            {METHODS.map((x) => (
              <TouchableOpacity key={x.key} style={[s.chip, method === x.key && { backgroundColor: m.color, borderColor: m.color }]} onPress={() => setMethod(x.key)}>
                <Text style={[s.chipText, method === x.key && { color: "#fff" }]}>{x.icon} {x.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.label}>Reference</Text>
          <TextInput style={s.input} value={reference} onChangeText={setReference} placeholder="Txn ID / receipt" placeholderTextColor="#94a3b8" autoCapitalize="none" />
          <TouchableOpacity style={[s.go, { backgroundColor: m.color }]} disabled={busy}
            onPress={() => {
              if (!Number(amount) || Number(amount) <= 0) { setError("Enter an amount greater than zero."); return; }
              run(() => API.post(`/enrollments/${e._id}/payments`, { amount: Number(amount), method, reference }), "Payment recorded.");
            }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.goText}>Save payment</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      {panel === "renew" ? (
        <View style={s.panel}>
          <Text style={s.panelTitle}>Renew enrollment</Text>
          <Text style={s.hint}>Current expiry {shortDate(e.expiryDate)}. Renewal extends from expiry if still valid, otherwise from today.</Text>
          <View style={s.chips}>
            {[1, 3, 6, 12, 24].map((n) => (
              <TouchableOpacity key={n} style={[s.chip, months === n && { backgroundColor: m.color, borderColor: m.color }]} onPress={() => setMonths(n)}>
                <Text style={[s.chipText, months === n && { color: "#fff" }]}>{n} month{n > 1 ? "s" : ""}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <Text style={s.label}>Renewal amount (optional)</Text>
          <TextInput style={s.input} value={amount} onChangeText={setAmount} keyboardType="numeric" placeholder="0" placeholderTextColor="#94a3b8" />
          <Text style={s.label}>Method</Text>
          <View style={s.chips}>
            {METHODS.map((x) => (
              <TouchableOpacity key={x.key} style={[s.chip, method === x.key && { backgroundColor: m.color, borderColor: m.color }]} onPress={() => setMethod(x.key)}>
                <Text style={[s.chipText, method === x.key && { color: "#fff" }]}>{x.icon} {x.label}</Text>
              </TouchableOpacity>
            ))}
          </View>
          <TouchableOpacity style={[s.go, { backgroundColor: m.color }]} disabled={busy}
            onPress={() => run(() => API.post(`/enrollments/${e._id}/renew`, { months, amount: Number(amount || 0), method }), "Renewed.")}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.goText}>Renew {months} month{months > 1 ? "s" : ""}</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      {panel === "edit" ? (
        <View style={s.panel}>
          <Text style={s.panelTitle}>Edit details</Text>
          <Text style={s.label}>Plan name</Text>
          <TextInput style={s.input} value={editName} onChangeText={setEditName} />
          <Text style={s.label}>Expiry (YYYY-MM-DD)</Text>
          <TextInput style={s.input} value={editExpiry} onChangeText={setEditExpiry} autoCapitalize="none" />
          {m.hasFee ? (
            <>
              <Text style={s.label}>Monthly fee</Text>
              <TextInput style={s.input} value={editFee} onChangeText={setEditFee} keyboardType="numeric" />
            </>
          ) : null}
          <Text style={s.label}>Benefits</Text>
          <TextInput style={[s.input, s.area]} value={editBenefits} onChangeText={setEditBenefits} multiline />
          <Text style={s.label}>Internal notes</Text>
          <TextInput style={[s.input, s.area]} value={editNotes} onChangeText={setEditNotes} multiline />
          <TouchableOpacity style={[s.go, { backgroundColor: m.color }]} disabled={busy}
            onPress={() => {
              if (!/^\d{4}-\d{2}-\d{2}$/.test(editExpiry)) { setError("Expiry must be YYYY-MM-DD."); return; }
              run(() => API.patch(`/enrollments/${e._id}`, {
                programName: editName, expiryDate: editExpiry,
                benefits: editBenefits, notes: editNotes,
                ...(m.hasFee ? { monthlyFee: Number(editFee || 0) } : {}),
              }), "Updated.");
            }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.goText}>Save changes</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      {panel === "cancel" ? (
        <View style={[s.panel, { borderColor: "#fca5a5" }]}>
          <Text style={[s.panelTitle, { color: "#b91c1c" }]}>Cancel this enrollment</Text>
          <Text style={s.hint}>The patient keeps their payment history but loses active benefits. This cannot be undone.</Text>
          <TextInput style={[s.input, s.area]} value={reason} onChangeText={setReason} multiline placeholder="Reason (required)" placeholderTextColor="#94a3b8" />
          <TouchableOpacity style={[s.go, { backgroundColor: "#dc2626" }]} disabled={busy}
            onPress={() => {
              if (!reason.trim()) { setError("A reason is required."); return; }
              run(() => API.post(`/enrollments/${e._id}/cancel`, { reason: reason.trim() }), "Cancelled.");
            }}>
            {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.goText}>Confirm cancellation</Text>}
          </TouchableOpacity>
        </View>
      ) : null}

      {e.payments?.length ? (
        <>
          <Text style={s.h2}>Payment history</Text>
          <View style={s.table}>
            {e.payments.slice().reverse().map((p: any, i: number) => (
              <View key={p._id || i} style={s.tRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.tDate}>{shortDate(p.paidAt)}</Text>
                  <Text style={s.tMeta}>{methodLabel(p.method)}{p.reference ? ` · ${p.reference}` : ""}{p.collectedByName ? ` · ${p.collectedByName}` : ""}</Text>
                </View>
                <Text style={s.tAmt}>{ugx(p.amount)}</Text>
              </View>
            ))}
            <View style={[s.tRow, s.tTotal]}>
              <Text style={s.tTotalLabel}>Total collected</Text>
              <Text style={s.tTotalVal}>{ugx(e.totalPaid)}</Text>
            </View>
          </View>
        </>
      ) : null}

      {e.renewals?.length ? (
        <>
          <Text style={s.h2}>Renewals</Text>
          <View style={s.table}>
            {e.renewals.slice().reverse().map((r: any, i: number) => (
              <View key={r._id || i} style={s.tRow}>
                <View style={{ flex: 1 }}>
                  <Text style={s.tDate}>{shortDate(r.previousExpiry)} → {shortDate(r.newExpiry)}</Text>
                  <Text style={s.tMeta}>{r.months} month(s){r.renewedByName ? ` · ${r.renewedByName}` : ""} · {shortDate(r.renewedAt)}</Text>
                </View>
                <Text style={s.tAmt}>{r.amount ? ugx(r.amount) : "—"}</Text>
              </View>
            ))}
          </View>
        </>
      ) : null}

      <Text style={s.issued}>
        Enrolled by {e.enrolledByName || e.enrolledBy?.name || "Staff"} · {longDateTime(e.createdAt)}
      </Text>

      <TouchableOpacity style={s.backLink} onPress={() => router.replace("/enrollments")}>
        <Text style={s.backLinkText}>← Back to enrollment register</Text>
      </TouchableOpacity>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

function Cell({ k, v, color }: any) {
  return (
    <View style={[s.cell, { borderLeftColor: color }]}>
      <Text style={s.cellKey}>{k}</Text>
      <Text style={s.cellVal}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },
  page: { padding: 14, paddingBottom: 30 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#f1f5f9", padding: 30 },
  muted: { color: "#64748b", marginTop: 10, fontSize: 13.5, textAlign: "center" },
  errIcon: { fontSize: 38 },
  errTitle: { fontSize: 18, fontWeight: "800", color: "#0f172a", marginTop: 10 },
  backBtn: { backgroundColor: "#0f172a", borderRadius: 10, paddingVertical: 11, paddingHorizontal: 22, marginTop: 18 },
  backBtnText: { color: "#5eead4", fontWeight: "800", fontSize: 13.5 },

  card: { backgroundColor: "#fff", borderRadius: 18, overflow: "hidden", borderWidth: 1.5, maxWidth: 680, width: "100%", alignSelf: "center" },
  band: { paddingHorizontal: 20, paddingTop: 16, paddingBottom: 18, overflow: "hidden" },
  orb: { position: "absolute", width: 190, height: 190, borderRadius: 95, opacity: 0.45, right: -60, top: -100 },
  orb2: { position: "absolute", width: 110, height: 110, borderRadius: 55, opacity: 0.3, left: -40, bottom: -60 },
  bandFac: { color: "#ffffffcc", fontSize: 10.5, fontWeight: "800", letterSpacing: 2, textTransform: "uppercase" },
  bandRow: { flexDirection: "row", alignItems: "center", gap: 9, marginTop: 8 },
  bandIcon: { fontSize: 19 },
  bandKind: { flex: 1, color: "#fff", fontSize: 19, fontWeight: "800" },
  statusPill: { flexDirection: "row", alignItems: "center", gap: 5, borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4 },
  statusDot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { fontSize: 10.5, fontWeight: "800" },

  cardBody: { padding: 20 },
  name: { fontSize: 26, fontWeight: "800", color: "#0f172a", letterSpacing: -0.4 },
  plan: { fontSize: 15, color: "#475569", fontWeight: "600", marginTop: 3 },
  numBox: { alignSelf: "flex-start", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, marginTop: 14 },
  num: { fontSize: 13, fontWeight: "800", letterSpacing: 2 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 9, marginTop: 18 },
  cell: { backgroundColor: "#f8fafc", borderRadius: 10, paddingVertical: 10, paddingHorizontal: 13, borderLeftWidth: 3, minWidth: 148, flexGrow: 1 },
  cellKey: { fontSize: 9.5, fontWeight: "800", color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" },
  cellVal: { fontSize: 14, fontWeight: "700", color: "#0f172a", marginTop: 3 },
  noteBox: { backgroundColor: "#f8fafc", borderRadius: 10, padding: 13, marginTop: 12 },
  noteKey: { fontSize: 9.5, fontWeight: "800", color: "#94a3b8", letterSpacing: 1, textTransform: "uppercase" },
  noteVal: { fontSize: 13, color: "#334155", marginTop: 5, lineHeight: 19 },

  flash: { backgroundColor: "#dcfce7", color: "#166534", padding: 12, borderRadius: 10, marginTop: 14, fontSize: 13, fontWeight: "600" },
  error: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: 12, borderRadius: 10, marginTop: 14, fontSize: 13 },

  actions: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 16 },
  act: { borderRadius: 10, paddingVertical: 11, paddingHorizontal: 16, flexGrow: 1, alignItems: "center", minWidth: 130 },
  actOutline: { backgroundColor: "#fff", borderWidth: 1, borderColor: "#cbd5e1" },
  actText: { color: "#fff", fontWeight: "800", fontSize: 13 },

  panel: { backgroundColor: "#fff", borderRadius: 14, padding: 18, marginTop: 14, borderWidth: 1, borderColor: "#e2e8f0" },
  panelTitle: { fontSize: 16, fontWeight: "800", color: "#0f172a" },
  label: { fontSize: 12.5, fontWeight: "700", color: "#334155", marginTop: 14, marginBottom: 6 },
  hint: { fontSize: 11.5, color: "#94a3b8", marginTop: 6, lineHeight: 17 },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14.5, color: "#0f172a" },
  area: { minHeight: 70, textAlignVertical: "top" },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  chip: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6 },
  chipText: { fontSize: 11.5, fontWeight: "700", color: "#475569" },
  go: { borderRadius: 10, paddingVertical: 13, alignItems: "center", marginTop: 18 },
  goText: { color: "#fff", fontWeight: "800", fontSize: 14 },

  h2: { fontSize: 11.5, fontWeight: "800", color: "#64748b", letterSpacing: 1.2, textTransform: "uppercase", marginTop: 24, marginBottom: 9 },
  table: { backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#e2e8f0" },
  tRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 15, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  tDate: { fontSize: 13.5, fontWeight: "700", color: "#0f172a" },
  tMeta: { fontSize: 11.5, color: "#94a3b8", marginTop: 2 },
  tAmt: { fontSize: 14, fontWeight: "800", color: "#0f766e" },
  tTotal: { backgroundColor: "#0f172a", borderBottomWidth: 0 },
  tTotalLabel: { flex: 1, color: "#94a3b8", fontSize: 11.5, fontWeight: "800", letterSpacing: 1, textTransform: "uppercase" },
  tTotalVal: { color: "#5eead4", fontSize: 16, fontWeight: "800" },

  issued: { fontSize: 11.5, color: "#94a3b8", marginTop: 18, textAlign: "center" },
  backLink: { paddingVertical: 14, alignItems: "center" },
  backLinkText: { color: "#0d9488", fontWeight: "700", fontSize: 13.5 },
});
import React, { useContext, useState } from "react";
import {
  View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform,
} from "react-native";
import { useRouter } from "expo-router";
import API from "../src/services/api";
import { AuthContext } from "../src/context/AuthContext";
import {
  TYPE_META, CATEGORIES, METHODS, EnrollmentType, ugx, shortDate, addMonths,
} from "../src/config/enrollmentConfig";

const DURATIONS = [
  { m: 1, label: "1 month" }, { m: 3, label: "3 months" },
  { m: 6, label: "6 months" }, { m: 12, label: "1 year" },
];

export default function EnrollPatientScreen() {
  const router = useRouter();
  const { facilityName } = useContext(AuthContext);

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<any>(null);

  const [pq, setPq] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<any[]>([]);
  const [patient, setPatient] = useState<any>(null);
  const [existing, setExisting] = useState<any[]>([]);

  const [type, setType] = useState<EnrollmentType | "">("");
  const [programName, setProgramName] = useState("");
  const [category, setCategory] = useState("");
  const [months, setMonths] = useState(12);
  const [expiryDate, setExpiryDate] = useState(addMonths(12));
  const [fee, setFee] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [nextVisit, setNextVisit] = useState("");
  const [donorName, setDonorName] = useState("");
  const [donorRef, setDonorRef] = useState("");
  const [benefits, setBenefits] = useState("");
  const [notes, setNotes] = useState("");

  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("cash");
  const [payRef, setPayRef] = useState("");

  const meta = type ? TYPE_META[type] : null;

  const searchPatients = async () => {
    if (pq.trim().length < 2) { setError("Type at least 2 characters."); return; }
    setSearching(true); setError("");
    try {
      const res = await API.get("/patients/search", { params: { name: pq.trim() } });
      const list = (res.data?.results || []).map((r: any) => r.patient);
      setResults(list);
      if (list.length === 0) setError("No patient found. Register them at reception first.");
    } catch (e: any) {
      setError(e?.response?.data?.error || "Search failed.");
    } finally { setSearching(false); }
  };

  const pickPatient = async (p: any) => {
    setPatient(p); setError("");
    try {
      const res = await API.get(`/enrollments/patient/${p._id}`);
      setExisting(res.data?.enrollments || []);
    } catch { setExisting([]); }
    setStep(2);
  };

  const applyDuration = (m: number) => { setMonths(m); setExpiryDate(addMonths(m)); };

  const next = () => {
    setError("");
    if (step === 1 && !patient) { setError("Select a patient to continue."); return; }
    if (step === 2) {
      if (!type) { setError("Choose an enrollment type."); return; }
      setStep(3); return;
    }
    if (step === 3) {
      if (programName.trim().length < 2) { setError("Enter the plan or program name."); return; }
      if (!/^\d{4}-\d{2}-\d{2}$/.test(expiryDate)) { setError("Expiry must be YYYY-MM-DD."); return; }
      if (new Date(expiryDate) <= new Date()) { setError("Expiry must be in the future."); return; }
      if (meta?.hasFee && fee && Number.isNaN(Number(fee))) { setError("Monthly fee must be a number."); return; }
      if (nextVisit && !/^\d{4}-\d{2}-\d{2}$/.test(nextVisit)) { setError("Next visit must be YYYY-MM-DD."); return; }
      setStep(meta?.hasFee ? 4 : 5); return;
    }
    if (step === 4) {
      if (payAmount && (Number.isNaN(Number(payAmount)) || Number(payAmount) < 0)) {
        setError("Payment must be a positive number."); return;
      }
      setStep(5); return;
    }
  };

  const back = () => {
    setError("");
    if (step === 5 && !meta?.hasFee) { setStep(3); return; }
    if (step === 1) { router.back(); return; }
    setStep(step - 1);
  };

  const submit = async () => {
    setBusy(true); setError("");
    try {
      const body: any = {
        patient: patient._id, type, programName: programName.trim(),
        expiryDate, benefits: benefits.trim() || undefined, notes: notes.trim() || undefined,
      };
      if (meta?.hasFee) body.monthlyFee = Number(fee || 0);
      if (meta?.hasCategory && category) body.programCategory = category;
      if (meta?.hasClinical) {
        body.diagnosis = diagnosis.trim() || undefined;
        body.nextVisit = nextVisit || undefined;
      }
      if (meta?.hasDonor) {
        body.donorName = donorName.trim() || undefined;
        body.donorReference = donorRef.trim() || undefined;
      }
      if (Number(payAmount) > 0) {
        body.initialPayment = { amount: Number(payAmount), method: payMethod, reference: payRef.trim() || undefined };
      }

      const res = await API.post("/enrollments", body);
      setCreated(res.data?.enrollment);
    } catch (e: any) {
      setError(e?.response?.data?.error || "Could not create enrollment.");
    } finally { setBusy(false); }
  };

  const resetAll = () => {
    setCreated(null); setStep(1); setPatient(null); setExisting([]); setPq(""); setResults([]);
    setType(""); setProgramName(""); setCategory(""); applyDuration(12); setFee("");
    setDiagnosis(""); setNextVisit(""); setDonorName(""); setDonorRef("");
    setBenefits(""); setNotes(""); setPayAmount(""); setPayMethod("cash"); setPayRef(""); setError("");
  };

  if (created) {
    const m = TYPE_META[created.type as EnrollmentType];
    return (
      <ScrollView style={s.root} contentContainerStyle={s.page}>
        <View style={[s.successCard, { borderColor: m.color }]}>
          <View style={[s.successBand, { backgroundColor: m.color }]}>
            <View style={[s.orb, { backgroundColor: m.deep }]} />
            <Text style={s.successIcon}>{m.icon}</Text>
            <Text style={s.successBandText}>{m.label}</Text>
          </View>
          <View style={{ padding: 20 }}>
            <Text style={s.successTick}>✓ Enrolled</Text>
            <Text style={s.successName}>{created.patient?.name}</Text>
            <Text style={s.successProgram}>{created.programName}</Text>
            <View style={s.kvGrid}>
              <KV k="Enrollment no." v={created.enrollmentNumber} mono />
              <KV k="Valid until" v={shortDate(created.expiryDate)} />
              <KV k="Facility" v={facilityName || "—"} />
              <KV k="Amount paid" v={ugx(created.totalPaid)} />
            </View>
            <TouchableOpacity style={[s.primary, { backgroundColor: m.color }]} onPress={() => router.replace({ pathname: "/enrollment-detail", params: { id: created._id } })}>
              <Text style={s.primaryText}>Open enrollment card</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ghost} onPress={resetAll}>
              <Text style={s.ghostText}>Enroll another patient</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.ghost} onPress={() => router.replace("/enrollments")}>
              <Text style={s.ghostText}>Back to register</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    );
  }

  const totalSteps = meta?.hasFee || step >= 4 ? 5 : 5;

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={s.root} contentContainerStyle={s.page} keyboardShouldPersistTaps="handled">
        <View style={s.shell}>
          <Text style={s.kicker}>{facilityName || "MedTrack"}</Text>
          <Text style={s.h1}>New enrollment</Text>

          <View style={s.progressRow}>
            {[1, 2, 3, 4, 5].map((n) => (
              <View key={n} style={[s.bar, step >= n && s.barOn]} />
            ))}
          </View>
          <Text style={s.stepLabel}>
            Step {step} of {totalSteps} · {["Patient", "Type", "Details", "Payment", "Review"][step - 1]}
          </Text>

          {step === 1 ? (
            <>
              <Text style={s.section}>Who are you enrolling?</Text>
              <View style={s.searchRow}>
                <TextInput
                  style={[s.input, { flex: 1 }]}
                  value={pq}
                  onChangeText={setPq}
                  onSubmitEditing={searchPatients}
                  placeholder="Patient name or phone"
                  placeholderTextColor="#94a3b8"
                />
                <TouchableOpacity style={s.searchBtn} onPress={searchPatients} disabled={searching}>
                  {searching ? <ActivityIndicator color="#fff" /> : <Text style={s.searchBtnText}>Search</Text>}
                </TouchableOpacity>
              </View>

              {results.map((p) => (
                <TouchableOpacity key={p._id} style={s.patientRow} onPress={() => pickPatient(p)} activeOpacity={0.8}>
                  <View style={s.avatar}><Text style={s.avatarText}>{String(p.name || "?").charAt(0).toUpperCase()}</Text></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.patientName}>{p.name}</Text>
                    <Text style={s.patientMeta}>{p.phone || "no phone"} · {p.gender || "—"} · {p.age ?? "—"} yrs</Text>
                  </View>
                  <Text style={s.chev}>›</Text>
                </TouchableOpacity>
              ))}
            </>
          ) : null}

          {step === 2 ? (
            <>
              <PatientStrip p={patient} existing={existing} />
              <Text style={s.section}>What kind of enrollment?</Text>
              {(Object.keys(TYPE_META) as EnrollmentType[]).map((k) => {
                const t = TYPE_META[k]; const on = type === k;
                return (
                  <TouchableOpacity key={k} style={[s.typeCard, on && { borderColor: t.color, backgroundColor: t.soft }]} onPress={() => { setType(k); setError(""); }} activeOpacity={0.85}>
                    <View style={[s.typeIconBox, { backgroundColor: t.color }]}><Text style={{ fontSize: 20 }}>{t.icon}</Text></View>
                    <View style={{ flex: 1 }}>
                      <Text style={[s.typeLabel, on && { color: t.ink }]}>{t.label}</Text>
                      <Text style={s.typeBlurb}>{t.blurb}</Text>
                    </View>
                    {on ? <Text style={[s.tick, { color: t.color }]}>✓</Text> : null}
                  </TouchableOpacity>
                );
              })}
            </>
          ) : null}

          {step === 3 && meta ? (
            <>
              <PatientStrip p={patient} existing={existing} />
              <Text style={s.section}>{meta.label} details</Text>

              <Text style={s.label}>Plan / program name *</Text>
              <View style={s.presetRow}>
                {meta.presets.map((p) => (
                  <TouchableOpacity key={p} style={[s.preset, programName === p && { backgroundColor: meta.color, borderColor: meta.color }]} onPress={() => setProgramName(p)}>
                    <Text style={[s.presetText, programName === p && { color: "#fff" }]}>{p}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={s.input} value={programName} onChangeText={setProgramName} placeholder="Or type a custom name" placeholderTextColor="#94a3b8" />

              {meta.hasCategory ? (
                <>
                  <Text style={s.label}>Clinical category</Text>
                  <View style={s.presetRow}>
                    {CATEGORIES.map((c) => (
                      <TouchableOpacity key={c.key} style={[s.preset, category === c.key && { backgroundColor: meta.color, borderColor: meta.color }]} onPress={() => setCategory(category === c.key ? "" : c.key)}>
                        <Text style={[s.presetText, category === c.key && { color: "#fff" }]}>{c.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </>
              ) : null}

              <Text style={s.label}>Valid for *</Text>
              <View style={s.presetRow}>
                {DURATIONS.map((d) => (
                  <TouchableOpacity key={d.m} style={[s.preset, months === d.m && { backgroundColor: meta.color, borderColor: meta.color }]} onPress={() => applyDuration(d.m)}>
                    <Text style={[s.presetText, months === d.m && { color: "#fff" }]}>{d.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TextInput style={s.input} value={expiryDate} onChangeText={(v) => { setExpiryDate(v); setMonths(0); }} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" autoCapitalize="none" />
              <Text style={s.hint}>Expires {shortDate(expiryDate)}</Text>

              {meta.hasFee ? (
                <>
                  <Text style={s.label}>Monthly fee (UGX)</Text>
                  <TextInput style={s.input} value={fee} onChangeText={setFee} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="numeric" />
                </>
              ) : null}

              {meta.hasClinical ? (
                <>
                  <Text style={s.label}>Diagnosis / clinical note</Text>
                  <TextInput style={[s.input, s.area]} value={diagnosis} onChangeText={setDiagnosis} multiline placeholder="Baseline diagnosis, regimen, stage…" placeholderTextColor="#94a3b8" />
                  <Text style={s.label}>Next scheduled visit</Text>
                  <TextInput style={s.input} value={nextVisit} onChangeText={setNextVisit} placeholder="YYYY-MM-DD" placeholderTextColor="#94a3b8" autoCapitalize="none" />
                </>
              ) : null}

              {meta.hasDonor ? (
                <>
                  <Text style={s.label}>Donor / funder</Text>
                  <TextInput style={s.input} value={donorName} onChangeText={setDonorName} placeholder="e.g. Global Fund" placeholderTextColor="#94a3b8" />
                  <Text style={s.label}>Donor reference</Text>
                  <TextInput style={s.input} value={donorRef} onChangeText={setDonorRef} placeholder="Grant / batch reference" placeholderTextColor="#94a3b8" autoCapitalize="none" />
                </>
              ) : null}

              <Text style={s.label}>Benefits</Text>
              <TextInput style={[s.input, s.area]} value={benefits} onChangeText={setBenefits} multiline placeholder="e.g. Free consultations, 50% off laboratory, free ARV refills" placeholderTextColor="#94a3b8" />
              <Text style={s.label}>Internal notes</Text>
              <TextInput style={[s.input, s.area]} value={notes} onChangeText={setNotes} multiline placeholder="Staff-only notes" placeholderTextColor="#94a3b8" />
            </>
          ) : null}

          {step === 4 && meta ? (
            <>
              <PatientStrip p={patient} existing={existing} />
              <Text style={s.section}>Initial payment</Text>
              <Text style={s.hint}>Optional — you can record payments later from the enrollment card.</Text>
              <Text style={s.label}>Amount (UGX)</Text>
              <TextInput style={s.input} value={payAmount} onChangeText={setPayAmount} placeholder="0" placeholderTextColor="#94a3b8" keyboardType="numeric" />
              <View style={s.presetRow}>
                {[Number(fee || 0), Number(fee || 0) * 3, Number(fee || 0) * 6, Number(fee || 0) * 12].filter((v) => v > 0).map((v, i) => (
                  <TouchableOpacity key={i} style={[s.preset, Number(payAmount) === v && { backgroundColor: meta.color, borderColor: meta.color }]} onPress={() => setPayAmount(String(v))}>
                    <Text style={[s.presetText, Number(payAmount) === v && { color: "#fff" }]}>{ugx(v)}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.label}>Method</Text>
              <View style={s.presetRow}>
                {METHODS.map((m) => (
                  <TouchableOpacity key={m.key} style={[s.preset, payMethod === m.key && { backgroundColor: meta.color, borderColor: meta.color }]} onPress={() => setPayMethod(m.key)}>
                    <Text style={[s.presetText, payMethod === m.key && { color: "#fff" }]}>{m.icon} {m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <Text style={s.label}>Reference</Text>
              <TextInput style={s.input} value={payRef} onChangeText={setPayRef} placeholder="Txn ID / receipt no." placeholderTextColor="#94a3b8" autoCapitalize="none" />
            </>
          ) : null}

          {step === 5 && meta ? (
            <>
              <View style={[s.reviewCard, { borderColor: meta.color }]}>
                <View style={[s.reviewBand, { backgroundColor: meta.color }]}>
                  <Text style={s.reviewBandText}>{meta.icon}  {meta.label}</Text>
                </View>
                <View style={{ padding: 16 }}>
                  <KV k="Patient" v={patient?.name} />
                  <KV k="Plan" v={programName} />
                  {category ? <KV k="Category" v={CATEGORIES.find((c) => c.key === category)?.label} /> : null}
                  <KV k="Valid until" v={shortDate(expiryDate)} />
                  {meta.hasFee ? <KV k="Monthly fee" v={ugx(Number(fee || 0))} /> : null}
                  {donorName ? <KV k="Donor" v={donorName} /> : null}
                  {nextVisit ? <KV k="Next visit" v={shortDate(nextVisit)} /> : null}
                  <KV k="Initial payment" v={Number(payAmount) > 0 ? `${ugx(Number(payAmount))} · ${METHODS.find((m) => m.key === payMethod)?.label}` : "None"} />
                  {benefits ? <KV k="Benefits" v={benefits} /> : null}
                </View>
              </View>
              <Text style={s.hint}>Confirm to issue this enrollment. A printable card is generated immediately.</Text>
            </>
          ) : null}

          {error ? <Text style={s.error}>{error}</Text> : null}

          {step < 5 ? (
            <TouchableOpacity style={[s.primary, { backgroundColor: meta?.color || "#0f172a" }]} onPress={next}>
              <Text style={s.primaryText}>Continue</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={[s.primary, { backgroundColor: meta?.color || "#0d9488" }]} onPress={submit} disabled={busy}>
              {busy ? <ActivityIndicator color="#fff" /> : <Text style={s.primaryText}>Confirm enrollment</Text>}
            </TouchableOpacity>
          )}

          <TouchableOpacity style={s.ghost} onPress={back}>
            <Text style={s.ghostText}>{step === 1 ? "Cancel" : "Back"}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function PatientStrip({ p, existing }: any) {
  if (!p) return null;
  const active = (existing || []).filter((e: any) => e.status === "active");
  return (
    <View style={s.strip}>
      <View style={s.avatar}><Text style={s.avatarText}>{String(p.name || "?").charAt(0).toUpperCase()}</Text></View>
      <View style={{ flex: 1 }}>
        <Text style={s.patientName}>{p.name}</Text>
        <Text style={s.patientMeta}>
          {p.phone || "no phone"} · {active.length} active enrollment{active.length === 1 ? "" : "s"}
        </Text>
      </View>
    </View>
  );
}

function KV({ k, v, mono }: any) {
  return (
    <View style={s.kv}>
      <Text style={s.kvKey}>{k}</Text>
      <Text style={[s.kvVal, mono && s.mono]}>{v || "—"}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f1f5f9" },
  page: { padding: 14, paddingBottom: 40 },
  shell: { backgroundColor: "#fff", borderRadius: 16, padding: 20, maxWidth: 640, width: "100%", alignSelf: "center" },
  kicker: { fontSize: 11, fontWeight: "800", color: "#0d9488", letterSpacing: 1.1, textTransform: "uppercase" },
  h1: { fontSize: 24, fontWeight: "800", color: "#0f172a", marginTop: 5 },
  progressRow: { flexDirection: "row", gap: 5, marginTop: 16 },
  bar: { flex: 1, height: 4, borderRadius: 2, backgroundColor: "#e2e8f0" },
  barOn: { backgroundColor: "#0d9488" },
  stepLabel: { fontSize: 11.5, color: "#64748b", fontWeight: "700", marginTop: 8 },
  section: { fontSize: 12, fontWeight: "800", color: "#475569", textTransform: "uppercase", letterSpacing: 0.7, marginTop: 22, marginBottom: 10 },
  label: { fontSize: 12.5, fontWeight: "700", color: "#334155", marginTop: 15, marginBottom: 6 },
  hint: { fontSize: 11.5, color: "#94a3b8", marginTop: 6, lineHeight: 17 },
  input: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 10, paddingHorizontal: 13, paddingVertical: 11, fontSize: 14.5, color: "#0f172a", backgroundColor: "#fff" },
  area: { minHeight: 74, textAlignVertical: "top" },
  searchRow: { flexDirection: "row", gap: 8 },
  searchBtn: { backgroundColor: "#0f172a", borderRadius: 10, paddingHorizontal: 18, alignItems: "center", justifyContent: "center", minWidth: 88 },
  searchBtnText: { color: "#5eead4", fontWeight: "800", fontSize: 13.5 },
  patientRow: { flexDirection: "row", alignItems: "center", gap: 11, borderWidth: 1, borderColor: "#e2e8f0", borderRadius: 11, padding: 12, marginTop: 8 },
  avatar: { width: 38, height: 38, borderRadius: 19, backgroundColor: "#0f172a", alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#5eead4", fontWeight: "800", fontSize: 16 },
  patientName: { fontSize: 15, fontWeight: "700", color: "#0f172a" },
  patientMeta: { fontSize: 11.5, color: "#94a3b8", marginTop: 2 },
  chev: { fontSize: 24, color: "#cbd5e1" },
  strip: { flexDirection: "row", alignItems: "center", gap: 11, backgroundColor: "#f8fafc", borderRadius: 11, padding: 12, marginTop: 18, borderLeftWidth: 3, borderLeftColor: "#0d9488" },
  typeCard: { flexDirection: "row", alignItems: "center", gap: 12, borderWidth: 1.5, borderColor: "#e2e8f0", borderRadius: 12, padding: 14, marginBottom: 9 },
  typeIconBox: { width: 42, height: 42, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  typeLabel: { fontSize: 15.5, fontWeight: "800", color: "#0f172a" },
  typeBlurb: { fontSize: 11.5, color: "#64748b", marginTop: 2 },
  tick: { fontSize: 20, fontWeight: "800" },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginBottom: 8 },
  preset: { borderWidth: 1, borderColor: "#cbd5e1", borderRadius: 20, paddingHorizontal: 11, paddingVertical: 6, backgroundColor: "#fff" },
  presetText: { fontSize: 11.5, fontWeight: "700", color: "#475569" },
  reviewCard: { borderWidth: 1.5, borderRadius: 14, overflow: "hidden", marginTop: 20 },
  reviewBand: { paddingHorizontal: 16, paddingVertical: 11 },
  reviewBandText: { color: "#fff", fontWeight: "800", fontSize: 13, letterSpacing: 0.5 },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: 14, paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: "#f1f5f9" },
  kvKey: { fontSize: 12, color: "#94a3b8", fontWeight: "700", flexShrink: 0 },
  kvVal: { fontSize: 13, color: "#0f172a", fontWeight: "600", flex: 1, textAlign: "right" },
  kvGrid: { marginTop: 14 },
  mono: { letterSpacing: 0.8, color: "#0f766e", fontWeight: "800" },
  error: { backgroundColor: "#fee2e2", color: "#b91c1c", padding: 12, borderRadius: 10, marginTop: 16, fontSize: 13 },
  primary: { borderRadius: 11, paddingVertical: 14, alignItems: "center", marginTop: 22 },
  primaryText: { color: "#fff", fontSize: 15, fontWeight: "800" },
  ghost: { paddingVertical: 13, alignItems: "center" },
  ghostText: { color: "#64748b", fontSize: 13.5, fontWeight: "700" },
  successCard: { backgroundColor: "#fff", borderRadius: 16, overflow: "hidden", borderWidth: 1.5, maxWidth: 560, width: "100%", alignSelf: "center" },
  successBand: { flexDirection: "row", alignItems: "center", gap: 9, paddingHorizontal: 18, paddingVertical: 14, overflow: "hidden" },
  orb: { position: "absolute", width: 110, height: 110, borderRadius: 55, opacity: 0.45, right: -30, top: -50 },
  successIcon: { fontSize: 18 },
  successBandText: { color: "#fff", fontWeight: "800", fontSize: 13, letterSpacing: 0.7, textTransform: "uppercase" },
  successTick: { color: "#16a34a", fontWeight: "800", fontSize: 13 },
  successName: { fontSize: 23, fontWeight: "800", color: "#0f172a", marginTop: 6 },
  successProgram: { fontSize: 14.5, color: "#475569", fontWeight: "600", marginTop: 2 },
});
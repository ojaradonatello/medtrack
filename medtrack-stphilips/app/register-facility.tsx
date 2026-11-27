import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import API from "../src/services/api";

type FacilityTypeKey =
  | "hospital"
  | "clinic"
  | "pharmacy"
  | "drug_shop"
  | "diagnostic_centre"
  | "maternity_home";

const FACILITY_TYPES: {
  key: FacilityTypeKey;
  label: string;
  icon: string;
  desc: string;
  modules: string[];
}[] = [
  {
    key: "hospital",
    label: "Hospital",
    icon: "🏥",
    desc: "Full clinical workflow",
    modules: [
      "Consultation",
      "Laboratory",
      "Procedures",
      "Interpretation",
      "Prescriptions",
      "Billing",
      "Pharmacy",
      "Enrollment",
      "Attendance",
    ],
  },
  {
    key: "clinic",
    label: "Clinic",
    icon: "🏨",
    desc: "Consultation + billing + pharmacy",
    modules: [
      "Consultation",
      "Prescriptions",
      "Billing",
      "Pharmacy",
      "Enrollment",
      "Attendance",
    ],
  },
  {
    key: "pharmacy",
    label: "Pharmacy",
    icon: "💊",
    desc: "Sales, stock, cashier",
    modules: ["Billing Counter", "Patient Ledger", "Daily Cashier", "Stock"],
  },
  {
    key: "drug_shop",
    label: "Drug Shop",
    icon: "🏪",
    desc: "Sales, stock, cashier",
    modules: ["Billing Counter", "Patient Ledger", "Daily Cashier", "Stock"],
  },
  {
    key: "diagnostic_centre",
    label: "Diagnostic Centre",
    icon: "🧫",
    desc: "Laboratory + billing",
    modules: ["Laboratory", "Billing", "Billing Counter", "Daily Cashier"],
  },
  {
    key: "maternity_home",
    label: "Maternity Home",
    icon: "🤰",
    desc: "Antenatal + billing + pharmacy",
    modules: [
      "Consultation",
      "Billing",
      "Pharmacy",
      "Medical Form",
      "Enrollment",
      "Attendance",
    ],
  },
];

type Mode = "register" | "status" | "done";

export default function RegisterFacilityScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();

  const [mode, setMode] = useState<Mode>(
    params?.mode === "status" ? "status" : "register"
  );
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const [facilityType, setFacilityType] = useState<FacilityTypeKey | "">("");
  const [facilityName, setFacilityName] = useState("");
  const [town, setTown] = useState("");
  const [district, setDistrict] = useState("Gulu");
  const [facilityPhone, setFacilityPhone] = useState("");

  const [ownerName, setOwnerName] = useState("");
  const [ownerPhone, setOwnerPhone] = useState("");
   const [ownerEmail, setOwnerEmail] = useState( String(params?.email || "") );
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [doneInfo, setDoneInfo] = useState<any>(null);
  const [statusInfo, setStatusInfo] = useState<any>(null);

  const selectedType = FACILITY_TYPES.find((t) => t.key === facilityType);

  const resetMessages = () => {
    setError("");
    setStatusInfo(null);
  };

  const goNext = () => {
    resetMessages();

    if (step === 1) {
      if (!facilityType) {
        setError("Please choose your facility type.");
        return;
      }
      setStep(2);
      return;
    }

    if (step === 2) {
      if (facilityName.trim().length < 3) {
        setError("Facility name must be at least 3 characters.");
        return;
      }
      if (!town.trim()) {
        setError("Town is required.");
        return;
      }
      setStep(3);
      return;
    }
  };

  const handleSubmit = async () => {
    resetMessages();

    if (ownerName.trim().length < 3) {
      setError("Owner name must be at least 3 characters.");
      return;
    }

    if (ownerPhone.replace(/\D/g, "").length < 9) {
      setError("Enter a valid owner phone number.");
      return;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim())) {
      setError("Enter a valid email address.");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await API.post("/onboarding/register", {
        facilityName: facilityName.trim(),
        facilityType,
        town: town.trim(),
        district: district.trim(),
        address: town.trim(),
        facilityPhone: facilityPhone.trim() || ownerPhone.trim(),
        ownerName: ownerName.trim(),
        ownerPhone: ownerPhone.trim(),
        ownerEmail: ownerEmail.trim().toLowerCase(),
        password,
        requestedPlan: "pilot",
      });

      setDoneInfo(res.data);
      setMode("done");
    } catch (err: any) {
      setError(
        err?.response?.data?.error ||
          "Registration failed. Check your connection and try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckStatus = async () => {
    resetMessages();

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail.trim())) {
      setError("Enter the email you registered with.");
      return;
    }

    if (ownerPhone.replace(/\D/g, "").length < 9) {
      setError("Enter the phone number you registered with.");
      return;
    }

    setSubmitting(true);

    try {
      const res = await API.get("/onboarding/status", {
        params: {
          email: ownerEmail.trim().toLowerCase(),
          phone: ownerPhone.trim(),
        },
      });

      setStatusInfo(res.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.error || "Could not find that registration."
      );
    } finally {
      setSubmitting(false);
    }
  };

  // ---------------- DONE ----------------
  if (mode === "done") {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.pageInner}>
        <View style={styles.card}>
          <Text style={styles.bigIcon}>✅</Text>
          <Text style={styles.h1}>Registration received</Text>
          <Text style={styles.muted}>
            {doneInfo?.facility?.name} is now pending approval.
          </Text>

          <View style={styles.infoBox}>
            <Text style={styles.infoLine}>
              Type: {doneInfo?.facility?.type?.replace(/_/g, " ")}
            </Text>
            <Text style={styles.infoLine}>
              Plan: {doneInfo?.facility?.subscriptionPlan}
            </Text>
            <Text style={styles.infoLine}>
              Login email: {doneInfo?.account?.email}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>Enabled for your facility</Text>
          <View style={styles.chipRow}>
            {(doneInfo?.facility?.enabledModules || []).map((m: string) => (
              <View key={m} style={styles.chip}>
                <Text style={styles.chipText}>{m.replace(/_/g, " ")}</Text>
              </View>
            ))}
          </View>

          <Text style={styles.notice}>
            You will be contacted on {ownerPhone}. You cannot log in until your
            facility is approved.
          </Text>

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleCheckStatus}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Check approval status</Text>
            )}
          </TouchableOpacity>

          {statusInfo ? (
            <View style={styles.statusBox}>
              <Text style={styles.statusTitle}>
                {String(statusInfo.enrollmentStatus).toUpperCase()}
              </Text>
              <Text style={styles.muted}>{statusInfo.message}</Text>
            </View>
          ) : null}

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.ghostBtnText}>Back to login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ---------------- STATUS ONLY ----------------
  if (mode === "status") {
    return (
      <ScrollView style={styles.page} contentContainerStyle={styles.pageInner}>
        <View style={styles.card}>
          <Text style={styles.h1}>Check registration status</Text>
          <Text style={styles.muted}>
            Enter the email and phone you used to register.
          </Text>

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={ownerEmail}
            onChangeText={setOwnerEmail}
            placeholder="owner@facility.com"
            autoCapitalize="none"
            keyboardType="email-address"
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={ownerPhone}
            onChangeText={setOwnerPhone}
            placeholder="07XXXXXXXX"
            keyboardType="phone-pad"
          />

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleCheckStatus}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Check status</Text>
            )}
          </TouchableOpacity>

          {statusInfo ? (
            <View style={styles.statusBox}>
              <Text style={styles.statusTitle}>
                {String(statusInfo.enrollmentStatus).toUpperCase()}
              </Text>
              <Text style={styles.muted}>{statusInfo.message}</Text>
            </View>
          ) : null}

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => {
              resetMessages();
              setMode("register");
            }}
          >
            <Text style={styles.ghostBtnText}>Register a facility instead</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => router.replace("/")}
          >
            <Text style={styles.ghostBtnText}>Back to login</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    );
  }

  // ---------------- REGISTER WIZARD ----------------
  return (
    <ScrollView
      style={styles.page}
      contentContainerStyle={styles.pageInner}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.card}>
        <Text style={styles.brand}>🧠 MedTrack</Text>
        <Text style={styles.h1}>Register your facility</Text>

        <View style={styles.stepRow}>
          {[1, 2, 3].map((n) => (
            <View
              key={n}
              style={[styles.stepDot, step >= n && styles.stepDotActive]}
            >
              <Text
                style={[styles.stepNum, step >= n && styles.stepNumActive]}
              >
                {n}
              </Text>
            </View>
          ))}
        </View>

        {/* STEP 1 */}
        {step === 1 ? (
          <>
            <Text style={styles.sectionLabel}>
              What kind of facility do you run?
            </Text>

            {FACILITY_TYPES.map((t) => {
              const active = facilityType === t.key;
              return (
                <TouchableOpacity
                  key={t.key}
                  style={[styles.typeCard, active && styles.typeCardActive]}
                  onPress={() => {
                    setFacilityType(t.key);
                    resetMessages();
                  }}
                >
                  <Text style={styles.typeIcon}>{t.icon}</Text>
                  <View style={{ flex: 1 }}>
                    <Text
                      style={[styles.typeLabel, active && styles.typeLabelActive]}
                    >
                      {t.label}
                    </Text>
                    <Text style={styles.typeDesc}>{t.desc}</Text>
                  </View>
                  {active ? <Text style={styles.tick}>✓</Text> : null}
                </TouchableOpacity>
              );
            })}

            {selectedType ? (
              <>
                <Text style={styles.sectionLabel}>
                  You will get these features
                </Text>
                <View style={styles.chipRow}>
                  {selectedType.modules.map((m) => (
                    <View key={m} style={styles.chip}>
                      <Text style={styles.chipText}>{m}</Text>
                    </View>
                  ))}
                </View>
              </>
            ) : null}
          </>
        ) : null}

        {/* STEP 2 */}
        {step === 2 ? (
          <>
            <Text style={styles.sectionLabel}>Facility details</Text>

            <Text style={styles.label}>Facility name *</Text>
            <TextInput
              style={styles.input}
              value={facilityName}
              onChangeText={setFacilityName}
              placeholder="e.g. Life Drug Shop Gulu Central"
            />
            <Text style={styles.hint}>
              Include your town or branch so the name is unique.
            </Text>

            <Text style={styles.label}>Town *</Text>
            <TextInput
              style={styles.input}
              value={town}
              onChangeText={setTown}
              placeholder="e.g. Gulu"
            />

            <Text style={styles.label}>District</Text>
            <TextInput
              style={styles.input}
              value={district}
              onChangeText={setDistrict}
              placeholder="e.g. Gulu"
            />

            <Text style={styles.label}>Facility phone (optional)</Text>
            <TextInput
              style={styles.input}
              value={facilityPhone}
              onChangeText={setFacilityPhone}
              placeholder="07XXXXXXXX"
              keyboardType="phone-pad"
            />
          </>
        ) : null}

        {/* STEP 3 */}
        {step === 3 ? (
          <>
            <Text style={styles.sectionLabel}>
              Your administrator account
            </Text>

            <Text style={styles.label}>Your full name *</Text>
            <TextInput
              style={styles.input}
              value={ownerName}
              onChangeText={setOwnerName}
              placeholder="e.g. Jane Okello"
            />

            <Text style={styles.label}>Your phone *</Text>
            <TextInput
              style={styles.input}
              value={ownerPhone}
              onChangeText={setOwnerPhone}
              placeholder="07XXXXXXXX"
              keyboardType="phone-pad"
            />
            <Text style={styles.hint}>
              We will contact you on this number to approve your facility.
            </Text>

            <Text style={styles.label}>Your email *</Text>
            <TextInput
              style={styles.input}
              value={ownerEmail}
              onChangeText={setOwnerEmail}
              placeholder="owner@facility.com"
              autoCapitalize="none"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="At least 8 characters"
              secureTextEntry
            />

            <Text style={styles.label}>Confirm password *</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder="Repeat password"
              secureTextEntry
            />

            <View style={styles.infoBox}>
              <Text style={styles.infoLine}>
                Facility: {facilityName || "—"}
              </Text>
              <Text style={styles.infoLine}>
                Type: {selectedType?.label || "—"}
              </Text>
              <Text style={styles.infoLine}>Plan: pilot (30 days)</Text>
            </View>
          </>
        ) : null}

        {error ? <Text style={styles.errorText}>{error}</Text> : null}

        {step < 3 ? (
          <TouchableOpacity style={styles.primaryBtn} onPress={goNext}>
            <Text style={styles.primaryBtnText}>Continue</Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={styles.primaryBtn}
            onPress={handleSubmit}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Submit registration</Text>
            )}
          </TouchableOpacity>
        )}

        {step > 1 ? (
          <TouchableOpacity
            style={styles.ghostBtn}
            onPress={() => {
              resetMessages();
              setStep(step - 1);
            }}
          >
            <Text style={styles.ghostBtnText}>Back</Text>
          </TouchableOpacity>
        ) : null}

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => {
            resetMessages();
            setMode("status");
          }}
        >
          <Text style={styles.ghostBtnText}>
            Already registered? Check status
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.ghostBtn}
          onPress={() => router.replace("/")}
        >
          <Text style={styles.ghostBtnText}>Back to login</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: "#f3f4f6" },
  pageInner: { padding: 16, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 20,
    maxWidth: 620,
    width: "100%",
    alignSelf: "center",
  },
  brand: { fontSize: 15, fontWeight: "700", color: "#2563eb" },
  h1: { fontSize: 22, fontWeight: "700", color: "#111827", marginTop: 6 },
  bigIcon: { fontSize: 44, textAlign: "center" },
  muted: { fontSize: 14, color: "#6b7280", marginTop: 6, lineHeight: 20 },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 10,
  },
  stepRow: { flexDirection: "row", gap: 8, marginTop: 16 },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotActive: { backgroundColor: "#2563eb" },
  stepNum: { fontSize: 13, fontWeight: "700", color: "#6b7280" },
  stepNumActive: { color: "#fff" },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 10,
    padding: 14,
    marginBottom: 8,
  },
  typeCardActive: { borderColor: "#2563eb", backgroundColor: "#eff6ff" },
  typeIcon: { fontSize: 26 },
  typeLabel: { fontSize: 16, fontWeight: "600", color: "#111827" },
  typeLabelActive: { color: "#1d4ed8" },
  typeDesc: { fontSize: 12, color: "#6b7280", marginTop: 2 },
  tick: { fontSize: 18, color: "#2563eb", fontWeight: "700" },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  chip: {
    backgroundColor: "#eff6ff",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  chipText: { fontSize: 12, color: "#1d4ed8", fontWeight: "600" },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#374151",
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 11,
    fontSize: 15,
    color: "#111827",
    backgroundColor: "#fff",
  },
  hint: { fontSize: 12, color: "#9ca3af", marginTop: 5 },
  infoBox: {
    backgroundColor: "#f9fafb",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  infoLine: { fontSize: 13, color: "#374151", marginBottom: 3 },
  notice: {
    fontSize: 13,
    color: "#92400e",
    backgroundColor: "#fffbeb",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
    lineHeight: 19,
  },
  statusBox: {
    backgroundColor: "#f0fdf4",
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  statusTitle: { fontSize: 14, fontWeight: "700", color: "#166534" },
  errorText: {
    fontSize: 13,
    color: "#b91c1c",
    backgroundColor: "#fef2f2",
    borderRadius: 8,
    padding: 10,
    marginTop: 14,
  },
  primaryBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
    marginTop: 20,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontWeight: "700" },
  ghostBtn: { paddingVertical: 12, alignItems: "center", marginTop: 4 },
  ghostBtnText: { color: "#2563eb", fontSize: 14, fontWeight: "600" },
});
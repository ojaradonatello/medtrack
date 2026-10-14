import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Platform,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";

import { useRouter } from "expo-router";

import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

import {
  ErrorBanner,
  SuccessBanner,
} from "../components/StateView";

type Patient = {
  _id: string;
  name: string;
  age?: number;
  gender?: string;
  phone?: string;
  address?: string;
};

type ActiveVisit = {
  _id?: string;
  visitNumber?: string;
  status: string;
  currentDepartment: string;
  notes?: string;
};

type LookupResult = {
  found: boolean;
  patient: Patient | null;
  activeVisit: ActiveVisit | null;
  canCreateNewVisit: boolean;
  message?: string;
  error?: string;
};

function humanize(value?: string) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function toNumber(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  const num = Number(trimmed);

  if (Number.isNaN(num)) {
    return null;
  }

  return num;
}

export default function AddPatientScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [phone, setPhone] = useState("");

  const [checking, setChecking] = useState(false);
  const [lookup, setLookup] = useState<LookupResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [creatingVisit, setCreatingVisit] = useState(false);
  const [registering, setRegistering] = useState(false);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [address, setAddress] = useState("");
const [tribe, setTribe] = useState("");
const [nextOfKinName, setNextOfKinName] = useState("");
const [nextOfKinPhone, setNextOfKinPhone] = useState("");
const [notes, setNotes] = useState("");
  const [systolic, setSystolic] = useState("");
  const [diastolic, setDiastolic] = useState("");
  const [temperature, setTemperature] = useState("");
  const [pulse, setPulse] = useState("");
  const [weight, setWeight] = useState("");

  const resetForm = () => {
    setName("");
    setAge("");
    setGender("");
    setAddress("");
    setTribe("");
    setNextOfKinName("");
    setNextOfKinPhone("");
    setNotes("");
    setNotes("");
    setSystolic("");
    setDiastolic("");
    setTemperature("");
    setPulse("");
    setWeight("");
    setError(null);
  };

  const resetAll = () => {
    setPhone("");
    setLookup(null);
    setError(null);
    setSuccess(null);
    resetForm();
  };

  const buildVitalsPayload = () => {
    const vitals: any = {};

    const sys = toNumber(systolic);
    const dia = toNumber(diastolic);
    const temp = toNumber(temperature);
    const pul = toNumber(pulse);
    const wt = toNumber(weight);

    if (
      sys === null ||
      dia === null ||
      temp === null ||
      pul === null ||
      wt === null
    ) {
      return {
        error: "Vitals values must be numbers",
        vitals: null,
      };
    }

    if (
      (sys !== undefined || dia !== undefined) &&
      (sys === undefined || dia === undefined)
    ) {
      return {
        error: "Provide both systolic and diastolic blood pressure",
        vitals: null,
      };
    }

    if (sys !== undefined && dia !== undefined) {
      if (sys < 0 || sys > 300) {
        return {
          error: "Systolic blood pressure seems invalid",
          vitals: null,
        };
      }

      if (dia < 0 || dia > 200) {
        return {
          error: "Diastolic blood pressure seems invalid",
          vitals: null,
        };
      }

      vitals.bloodPressure = {
        systolic: sys,
        diastolic: dia,
      };
    }

    if (temp !== undefined) {
      if (temp < -50 || temp > 100) {
        return {
          error: "Temperature seems invalid",
          vitals: null,
        };
      }

      vitals.temperatureC = temp;
    }

    if (pul !== undefined) {
      if (pul < 0 || pul > 300) {
        return {
          error: "Pulse seems invalid",
          vitals: null,
        };
      }

      vitals.pulseBpm = pul;
    }

    if (wt !== undefined) {
      if (wt < 0 || wt > 500) {
        return {
          error: "Weight seems invalid",
          vitals: null,
        };
      }

      vitals.weightKg = wt;
    }

    if (Object.keys(vitals).length === 0) {
      return {
        error: null,
        vitals: null,
      };
    }

    return {
      error: null,
      vitals,
    };
  };

  const checkPatient = async () => {
    const cleanPhone = phone.trim();

    if (!cleanPhone) {
      setError("Enter a phone number to search.");
      return;
    }

    try {
      setChecking(true);
      setError(null);
      setSuccess(null);
      setLookup(null);
      resetForm();

      const res = await API.get("/reception/find-patient", {
        params: {
          phone: cleanPhone,
        },
      });

      setLookup(res.data);
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      if (status === 404) {
        setLookup({
          found: false,
          patient: null,
          activeVisit: null,
          canCreateNewVisit: false,
          message:
            data?.message ||
            "No patient found with this phone number. You can register a new patient below.",
        });
        return;
      }

      setError(
        data?.error ||
          err?.message ||
          "Failed to check patient. Please try again."
      );
    } finally {
      setChecking(false);
    }
  };

  const createVisitForExistingPatient = async () => {
    if (!lookup?.patient?._id) {
      setError("No patient selected.");
      return;
    }

    const vitalsResult = buildVitalsPayload();

    if (vitalsResult.error) {
      setError(vitalsResult.error);
      return;
    }

    try {
      setCreatingVisit(true);
      setError(null);
      setSuccess(null);

      const payload: any = {
        patientId: lookup.patient._id,
        notes:
          notes.trim() ||
          "Return visit created by reception",
      };

      if (vitalsResult.vitals) {
        payload.vitals = vitalsResult.vitals;
      }

      const res = await API.post(
        "/reception/create-visit-for-existing-patient",
        payload
      );

      const visitNumber = res.data?.visit?.visitNumber || "";

      setSuccess(
        `New visit created for ${lookup.patient.name}.\nVisit: ${visitNumber}`
      );

      resetAll();
      router.replace("/queue");
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      if (status === 409) {
        setError(
          data?.error ||
            "This patient already has an active visit."
        );
        return;
      }

      setError(
        data?.error ||
          err?.message ||
          "Failed to create visit for existing patient."
      );
    } finally {
      setCreatingVisit(false);
    }
  };

  const registerNewPatientAndVisit = async () => {
    const cleanPhone = phone.trim();
    const cleanName = name.trim();
    const cleanAddress = address.trim();
    const cleanTribe = tribe.trim();
    const cleanNextOfKinName = nextOfKinName.trim();
    const cleanNextOfKinPhone = nextOfKinPhone.trim();

    if (!cleanName) {
      setError("Enter patient name.");
      return;
    }

    if (!gender) {
      setError("Select patient gender.");
      return;
    }

    if (!cleanPhone) {
      setError("Enter patient phone number.");
      return;
    }

    let parsedAge: number | undefined;

    if (age.trim()) {
      parsedAge = Number(age);

      if (Number.isNaN(parsedAge)) {
        setError("Age must be a number.");
        return;
      }
    }

    const vitalsResult = buildVitalsPayload();

    if (vitalsResult.error) {
      setError(vitalsResult.error);
      return;
    }

    try {
      setRegistering(true);
      setError(null);
      setSuccess(null);
const patientPayload: any = {
  name: cleanName,
  gender,
  phone: cleanPhone,
  address: cleanAddress,
};

if (cleanTribe) {
  patientPayload.tribe = cleanTribe;
}

if (cleanNextOfKinName) {
  patientPayload.nextOfKinName = cleanNextOfKinName;
}

if (cleanNextOfKinPhone) {
  patientPayload.nextOfKinPhone = cleanNextOfKinPhone;
}

      if (parsedAge !== undefined) {
        patientPayload.age = parsedAge;
      }

      const visitPayload: any = {
        notes: notes.trim() || "Registered at reception",
      };

      if (vitalsResult.vitals) {
        visitPayload.vitals = vitalsResult.vitals;
      }

      const res = await API.post("/reception/register-patient-visit", {
        patient: patientPayload,
        visit: visitPayload,
      });

      const visitNumber = res.data?.visit?.visitNumber || "";

      setSuccess(
        `Patient registered.\nVisit ${visitNumber} created.`
      );

      resetAll();
      router.replace("/queue");
    } catch (err: any) {
      const status = err?.response?.status;
      const data = err?.response?.data;
      const rawMessage =
        data?.error ||
        err?.message ||
        "Failed to register patient.";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      if (
        status === 409 ||
        String(rawMessage).includes("E11000") ||
        String(rawMessage).toLowerCase().includes("duplicate key")
      ) {
        setError(
          "A patient with this phone number already exists. Please search the phone number again."
        );
        return;
      }

      setError(rawMessage);
    } finally {
      setRegistering(false);
    }
  };

  const patientFound = lookup?.found === true;
  const patientNotFound = lookup?.found === false;
  const hasActiveVisit = !!lookup?.activeVisit;

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.screen}>
        <Text style={styles.title}>👤 Reception Patient Flow</Text>

        <Text style={styles.subtitle}>
          Reception first searches by phone. If the patient exists, reception can create a new visit.
          If the patient does not exist, reception can register a new patient and create the first visit.
          Reception can also capture initial vitals.
        </Text>

        <Text style={styles.metaText}>
          Logged in as: {user?.name || "User"} | Role:{" "}
          {user?.role || "unknown"}
        </Text>

        <ErrorBanner message={error} />
        <SuccessBanner message={success} />

        <Text style={styles.label}>Patient Phone Number</Text>

        <View style={styles.searchRow}>
          <TextInput
            style={styles.searchInput}
            placeholder="07xxxxxxxx"
            value={phone}
            onChangeText={setPhone}
            keyboardType="phone-pad"
            autoCapitalize="none"
            editable={!checking && !creatingVisit && !registering}
          />

          <TouchableOpacity
            style={styles.searchButton}
            onPress={checkPatient}
            disabled={checking}
          >
            <Text style={styles.searchButtonText}>
              {checking ? "Checking..." : "Check"}
            </Text>
          </TouchableOpacity>
        </View>

        {checking ? (
          <View style={styles.inlineLoading}>
            <ActivityIndicator size="large" color="#2563eb" />
            <Text style={styles.inlineLoadingText}>
              Searching patient...
            </Text>
          </View>
        ) : null}

        {patientFound && lookup?.patient ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>✅ Patient Found</Text>

            <Text style={styles.patientName}>
              {lookup.patient.name}
            </Text>

            <Text style={styles.detail}>
              Phone: {lookup.patient.phone || "—"}
            </Text>

            <Text style={styles.detail}>
              Gender: {lookup.patient.gender || "—"}
            </Text>

            <Text style={styles.detail}>
              Age: {lookup.patient.age ?? "—"}
            </Text>

            <Text style={styles.detail}>
  Address: {lookup.patient.address || "—"}
</Text>

<Text style={styles.detail}>
  Tribe: {lookup.patient.tribe || "—"}
</Text>

<Text style={styles.detail}>
  Next of Kin: {lookup.patient.nextOfKinName || "—"}
</Text>

<Text style={styles.detail}>
  Next of Kin Phone: {lookup.patient.nextOfKinPhone || "—"}
</Text>

<View style={styles.divider} />

            {hasActiveVisit && lookup.activeVisit ? (
              <>
                <Text style={styles.warningTitle}>
                  ⚠️ Active Visit Exists
                </Text>

                <Text style={styles.detail}>
                  Status: {humanize(lookup.activeVisit.status)}
                </Text>

                <Text style={styles.detail}>
                  Department:{" "}
                  {humanize(lookup.activeVisit.currentDepartment)}
                </Text>

                {lookup.activeVisit.visitNumber ? (
                  <Text style={styles.detail}>
                    Visit Number: {lookup.activeVisit.visitNumber}
                  </Text>
                ) : null}

                {lookup.activeVisit.notes ? (
                  <Text style={styles.note}>
                    Note: {lookup.activeVisit.notes}
                  </Text>
                ) : null}

                <Text style={styles.infoText}>
                  This patient cannot receive another visit until the current
                  visit is completed or cancelled.
                </Text>

                <TouchableOpacity
                  style={styles.secondaryButton}
                  onPress={() => router.replace("/queue")}
                >
                  <Text style={styles.secondaryButtonText}>
                    Go to Patient Queue
                  </Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.successTitle}>
                  ✔️ Patient can receive a new visit
                </Text>

                <Text style={styles.label}>Visit Note</Text>

                <TextInput
                  style={[styles.input, styles.multilineInput]}
                  placeholder="Optional note, e.g. follow-up visit"
                  value={notes}
                  onChangeText={setNotes}
                  multiline
                  editable={!creatingVisit}
                />

                <View style={styles.vitalsSection}>
                  <Text style={styles.sectionTitle}>
                    Initial Vitals (optional)
                  </Text>

                  <View style={styles.vitalsGrid}>
                    <View style={styles.halfField}>
                      <Text style={styles.label}>Systolic</Text>
                      <TextInput
                        style={styles.input}
                        value={systolic}
                        onChangeText={setSystolic}
                        keyboardType="numeric"
                        placeholder="120"
                        editable={!creatingVisit}
                      />
                    </View>

                    <View style={styles.halfField}>
                      <Text style={styles.label}>Diastolic</Text>
                      <TextInput
                        style={styles.input}
                        value={diastolic}
                        onChangeText={setDiastolic}
                        keyboardType="numeric"
                        placeholder="80"
                        editable={!creatingVisit}
                      />
                    </View>
                  </View>

                  <Text style={styles.label}>Temperature °C</Text>
                  <TextInput
                    style={styles.input}
                    value={temperature}
                    onChangeText={setTemperature}
                    keyboardType="numeric"
                    placeholder="36.8"
                    editable={!creatingVisit}
                  />

                  <Text style={styles.label}>Pulse bpm</Text>
                  <TextInput
                    style={styles.input}
                    value={pulse}
                    onChangeText={setPulse}
                    keyboardType="numeric"
                    placeholder="78"
                    editable={!creatingVisit}
                  />

                  <Text style={styles.label}>Weight kg</Text>
                  <TextInput
                    style={styles.input}
                    value={weight}
                    onChangeText={setWeight}
                    keyboardType="numeric"
                    placeholder="70"
                    editable={!creatingVisit}
                  />
                </View>

                <TouchableOpacity
                  style={[
                    styles.primaryButton,
                    creatingVisit && styles.disabledButton,
                  ]}
                  onPress={createVisitForExistingPatient}
                  disabled={creatingVisit}
                >
                  {creatingVisit ? (
                    <View style={styles.buttonContent}>
                      <ActivityIndicator color="#fff" />
                      <Text style={styles.primaryButtonText}>
                        Creating visit...
                      </Text>
                    </View>
                  ) : (
                    <Text style={styles.primaryButtonText}>
                      Create New Visit
                    </Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </View>
        ) : null}

        {patientNotFound ? (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>
              🆕 New Patient Registration
            </Text>

            <Text style={styles.infoText}>
              {lookup?.message ||
                "No patient was found with this phone number. You can register the patient now."}
            </Text>

            <Text style={styles.label}>Full Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Patient name"
              value={name}
              onChangeText={setName}
              autoCapitalize="words"
              editable={!registering}
            />

            <Text style={styles.label}>Age</Text>
            <TextInput
              style={styles.input}
              placeholder="Optional"
              value={age}
              onChangeText={setAge}
              keyboardType="numeric"
              editable={!registering}
            />

            <Text style={styles.label}>Gender</Text>

            <View style={styles.genderRow}>
              <TouchableOpacity
                onPress={() => setGender("Male")}
                style={[
                  styles.genderButton,
                  gender === "Male" && styles.genderButtonSelected,
                ]}
                disabled={registering}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === "Male" && styles.genderTextSelected,
                  ]}
                >
                  👨 Male
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setGender("Female")}
                style={[
                  styles.genderButton,
                  gender === "Female" && styles.genderButtonSelected,
                ]}
                disabled={registering}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === "Female" && styles.genderTextSelected,
                  ]}
                >
                  👩 Female
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setGender("Other")}
                style={[
                  styles.genderButton,
                  gender === "Other" && styles.genderButtonSelected,
                ]}
                disabled={registering}
              >
                <Text
                  style={[
                    styles.genderText,
                    gender === "Other" && styles.genderTextSelected,
                  ]}
                >
                  Other
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.label}>Address</Text>
<TextInput
  style={[styles.input, styles.multilineInput]}
  placeholder="Village / area"
  value={address}
  onChangeText={setAddress}
  multiline
  editable={!registering}
/>

<Text style={styles.label}>Tribe</Text>
<TextInput
  style={styles.input}
  placeholder="Optional"
  value={tribe}
  onChangeText={setTribe}
  autoCapitalize="words"
  editable={!registering}
/>

<Text style={styles.label}>Next of Kin Name</Text>
<TextInput
  style={styles.input}
  placeholder="Optional"
  value={nextOfKinName}
  onChangeText={setNextOfKinName}
  autoCapitalize="words"
  editable={!registering}
/>

<Text style={styles.label}>Next of Kin Phone</Text>
<TextInput
  style={styles.input}
  placeholder="Optional"
  value={nextOfKinPhone}
  onChangeText={setNextOfKinPhone}
  keyboardType="phone-pad"
  autoCapitalize="none"
  editable={!registering}
/>

<Text style={styles.label}>Visit Note</Text>
            <TextInput
              style={[styles.input, styles.multilineInput]}
              placeholder="Optional note, e.g. new patient registration"
              value={notes}
              onChangeText={setNotes}
              multiline
              editable={!registering}
            />

            <View style={styles.vitalsSection}>
              <Text style={styles.sectionTitle}>
                Initial Vitals (optional)
              </Text>

              <View style={styles.vitalsGrid}>
                <View style={styles.halfField}>
                  <Text style={styles.label}>Systolic</Text>
                  <TextInput
                    style={styles.input}
                    value={systolic}
                    onChangeText={setSystolic}
                    keyboardType="numeric"
                    placeholder="120"
                    editable={!registering}
                  />
                </View>

                <View style={styles.halfField}>
                  <Text style={styles.label}>Diastolic</Text>
                  <TextInput
                    style={styles.input}
                    value={diastolic}
                    onChangeText={setDiastolic}
                    keyboardType="numeric"
                    placeholder="80"
                    editable={!registering}
                  />
                </View>
              </View>

              <Text style={styles.label}>Temperature °C</Text>
              <TextInput
                style={styles.input}
                value={temperature}
                onChangeText={setTemperature}
                keyboardType="numeric"
                placeholder="36.8"
                editable={!registering}
              />

              <Text style={styles.label}>Pulse bpm</Text>
              <TextInput
                style={styles.input}
                value={pulse}
                onChangeText={setPulse}
                keyboardType="numeric"
                placeholder="78"
                editable={!registering}
              />

              <Text style={styles.label}>Weight kg</Text>
              <TextInput
                style={styles.input}
                value={weight}
                onChangeText={setWeight}
                keyboardType="numeric"
                placeholder="70"
                editable={!registering}
              />
            </View>

            <TouchableOpacity
              style={[
                styles.primaryButton,
                registering && styles.disabledButton,
              ]}
              onPress={registerNewPatientAndVisit}
              disabled={registering}
            >
              {registering ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.primaryButtonText}>
                    Registering...
                  </Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>
                  Register Patient + Create Visit
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resetAll}
              disabled={registering}
            >
              <Text style={styles.secondaryButtonText}>
                Clear Form
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!lookup && !checking && !error ? (
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>
              Enter a phone number and tap Check to begin.
            </Text>
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
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

  label: {
    fontSize: 15,
    fontWeight: "600",
    marginBottom: 6,
    color: "#111827",
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },

  searchInput: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
    flex: 1,
  },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 16,
    fontSize: 15,
  },

  multilineInput: {
    minHeight: 80,
    textAlignVertical: "top",
  },

  searchButton: {
    backgroundColor: "#2563eb",
    padding: 12,
    borderRadius: 10,
    minWidth: 90,
    alignItems: "center",
  },

  searchButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  inlineLoading: {
    alignItems: "center",
    marginTop: 10,
    marginBottom: 16,
  },

  inlineLoadingText: {
    marginTop: 8,
    color: "#6b7280",
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },

  patientName: {
    fontSize: 20,
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
    marginVertical: 12,
  },

  warningTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#b45309",
    marginBottom: 8,
  },

  successTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#047857",
    marginBottom: 8,
  },

  infoText: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 12,
  },

  note: {
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 4,
  },

  genderRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 16,
  },

  genderButton: {
    flex: 1,
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#e5e7eb",
    alignItems: "center",
  },

  genderButtonSelected: {
    backgroundColor: "#2563eb",
  },

  genderText: {
    color: "#111827",
    fontWeight: "600",
  },

  genderTextSelected: {
    color: "#fff",
  },

  vitalsSection: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 16,
  },

  vitalsGrid: {
    flexDirection: "row",
    gap: 10,
  },

  halfField: {
    flex: 1,
  },

  primaryButton: {
    backgroundColor: "#2563eb",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginBottom: 10,
  },

  primaryButtonText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 16,
  },

  secondaryButton: {
    backgroundColor: "#e5e7eb",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  secondaryButtonText: {
    color: "#111827",
    fontWeight: "600",
  },

  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  disabledButton: {
    opacity: 0.6,
  },

  emptyBox: {
    backgroundColor: "#f3f4f6",
    padding: 20,
    borderRadius: 12,
    alignItems: "center",
  },

  emptyText: {
    color: "#6b7280",
    fontSize: 15,
    textAlign: "center",
  },
});
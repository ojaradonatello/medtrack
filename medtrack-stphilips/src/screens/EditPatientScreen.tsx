import React, { useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  StyleSheet,
  KeyboardAvoidingView,
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

import {
  LoadingState,
  ErrorState,
  ErrorBanner,
  SuccessBanner,
} from "../components/StateView";

function showMessage(title: string, message: string) {
  if (Platform.OS === "web" && typeof (globalThis as any).alert === "function") {
    (globalThis as any).alert(`${title}: ${message}`);
  } else {
    Alert.alert(title, message);
  }
}

export default function EditPatientScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user, logout } = useContext(AuthContext);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [tribe, setTribe] = useState("");
  const [nextOfKinName, setNextOfKinName] = useState("");
  const [nextOfKinPhone, setNextOfKinPhone] = useState("");

  const canEdit = user?.role === "admin" || user?.role === "reception" || user?.role === "doctor";

  useEffect(() => {
    const loadPatient = async () => {
      if (!id) {
        setError("No patient ID provided.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const res = await API.get(`/patients/${id}`);
        const p = res.data;

        setName(p.name || "");
        setAge(p.age !== undefined && p.age !== null ? String(p.age) : "");
        setGender(p.gender || "");
        setPhone(p.phone || "");
        setAddress(p.address || "");
        setTribe(p.tribe || "");
        setNextOfKinName(p.nextOfKinName || "");
        setNextOfKinPhone(p.nextOfKinPhone || "");
      } catch (err: any) {
        const status = err?.response?.status;
        const msg = err?.response?.data?.error || err?.message || "Failed to load patient";
        
        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }
        setError(msg);
      } finally {
        setLoading(false);
      }
    };

    loadPatient();
  }, [id, logout, router]);

  const savePatient = async () => {
    const cleanName = name.trim();
    const cleanPhone = phone.trim();

    if (!cleanName) {
      showMessage("Required", "Patient name is required.");
      return;
    }
    if (!cleanPhone) {
      showMessage("Required", "Phone number is required.");
      return;
    }
    if (!gender) {
      showMessage("Required", "Gender is required.");
      return;
    }

    let parsedAge: number | undefined;
    if (age.trim()) {
      parsedAge = Number(age);
      if (Number.isNaN(parsedAge)) {
        showMessage("Invalid", "Age must be a number.");
        return;
      }
    }

    const payload: any = {
      name: cleanName,
      phone: cleanPhone,
      gender,
      address: address.trim(),
      tribe: tribe.trim(),
      nextOfKinName: nextOfKinName.trim(),
      nextOfKinPhone: nextOfKinPhone.trim(),
    };

    if (parsedAge !== undefined) {
      payload.age = parsedAge;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      await API.put(`/patients/${id}`, payload);

      setSuccess("Patient updated successfully.");
      showMessage("Success", "Patient updated successfully.");
      
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.error || err?.message || "Failed to update patient";
      
      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }
      if (status === 409) {
        setError("A patient with this phone number already exists.");
        showMessage("Error", "A patient with this phone number already exists.");
        return;
      }
      
      setError(msg);
      showMessage("Error", msg);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <LoadingState title="Loading patient..." subtitle="Please wait." />;
  }

  if (!canEdit) {
    return <ErrorState message="You do not have permission to edit patients." onRetry={() => router.back()} />;
  }

  if (error && !name) {
    return <ErrorState message={error} onRetry={() => router.back()} />;
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView style={styles.screen}>
        <Text style={styles.title}>✏️ Edit Patient</Text>
        <Text style={styles.subtitle}>Update patient demographics and emergency contact information.</Text>

        <ErrorBanner message={error} />
        <SuccessBanner message={success} />

        <View style={styles.card}>
          <Text style={styles.label}>Full Name *</Text>
          <TextInput style={styles.input} value={name} onChangeText={setName} autoCapitalize="words" editable={!saving} />

          <Text style={styles.label}>Phone Number *</Text>
          <TextInput style={styles.input} value={phone} onChangeText={setPhone} keyboardType="phone-pad" autoCapitalize="none" editable={!saving} />

          <Text style={styles.label}>Age</Text>
          <TextInput style={styles.input} value={age} onChangeText={setAge} keyboardType="numeric" editable={!saving} />

          <Text style={styles.label}>Gender *</Text>
          <View style={styles.genderRow}>
            {["Male", "Female", "Other"].map((g) => (
              <TouchableOpacity
                key={g}
                onPress={() => setGender(g)}
                style={[styles.genderButton, gender === g && styles.genderButtonSelected]}
                disabled={saving}
              >
                <Text style={[styles.genderText, gender === g && styles.genderTextSelected]}>
                  {g}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Address</Text>
          <TextInput style={[styles.input, styles.multiline]} value={address} onChangeText={setAddress} multiline editable={!saving} />

          <Text style={styles.label}>Tribe</Text>
          <TextInput style={styles.input} value={tribe} onChangeText={setTribe} autoCapitalize="words" editable={!saving} />

          <Text style={styles.label}>Next of Kin Name</Text>
          <TextInput style={styles.input} value={nextOfKinName} onChangeText={setNextOfKinName} autoCapitalize="words" editable={!saving} />

          <Text style={styles.label}>Next of Kin Phone</Text>
          <TextInput style={styles.input} value={nextOfKinPhone} onChangeText={setNextOfKinPhone} keyboardType="phone-pad" autoCapitalize="none" editable={!saving} />

          <TouchableOpacity
            style={[styles.primaryButton, saving && styles.disabledButton]}
            onPress={savePatient}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.back()}
            disabled={saving}
          >
            <Text style={styles.secondaryButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 20, backgroundColor: "#f9fafb" },
  title: { fontSize: 24, fontWeight: "bold", marginBottom: 8 },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 16 },
  card: { backgroundColor: "#fff", padding: 16, borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb" },
  label: { fontSize: 14, fontWeight: "600", marginBottom: 6, color: "#111827" },
  input: { borderWidth: 1, borderColor: "#d1d5db", backgroundColor: "#fff", padding: 12, borderRadius: 10, marginBottom: 12, fontSize: 15 },
  multiline: { minHeight: 80, textAlignVertical: "top" },
  genderRow: { flexDirection: "row", gap: 10, marginBottom: 12 },
  genderButton: { flex: 1, padding: 12, borderRadius: 10, backgroundColor: "#e5e7eb", alignItems: "center" },
  genderButtonSelected: { backgroundColor: "#2563eb" },
  genderText: { color: "#111827", fontWeight: "600" },
  genderTextSelected: { color: "#fff" },
  primaryButton: { backgroundColor: "#2563eb", padding: 15, borderRadius: 10, alignItems: "center", marginBottom: 10, marginTop: 10 },
  primaryButtonText: { color: "#fff", fontWeight: "bold", fontSize: 16 },
  secondaryButton: { backgroundColor: "#e5e7eb", padding: 12, borderRadius: 10, alignItems: "center" },
  secondaryButtonText: { color: "#111827", fontWeight: "600" },
  disabledButton: { opacity: 0.6 },
});
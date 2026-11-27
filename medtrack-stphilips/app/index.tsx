import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
  TouchableOpacity,
  StyleSheet,
} from "react-native";
import { useRouter } from "expo-router";

import InputField from "../src/components/InputField";
import Button from "../src/components/Button";
import { AuthContext } from "../src/context/AuthContext";
import { getHomeRouteForRole } from "../src/config/routeGuards";
import { API_BASE_URL } from "../src/services/api";

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

export default function Login() {
  const { user, loading: authLoading, login } = useContext(AuthContext);
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [blockedNotice, setBlockedNotice] = useState("");

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (user?.role) {
      const home = getHomeRouteForRole(user.role);
      router.replace(home);
    }
  }, [user, authLoading, router]);

  const handleLogin = async () => {
    setBlockedNotice("");

    if (!email || !password) {
      showMessage("Error", "Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      const result: any = await login(email, password);

      const role = result?.user?.role;
      const home = getHomeRouteForRole(role);

      router.replace(home);
    } catch (err: any) {
      console.log("LOGIN ERROR FULL:", err?.response || err?.message || err);

      const status = err?.response?.status;
      const data = err?.response?.data;

      let message =
        data?.error || data?.message || err?.message || "Invalid credentials";

      if (status === 404) {
        message = "User not found. Check email.";
      } else if (status === 400) {
        message = data?.error || "Wrong password or invalid request.";
      } else if (status === 401) {
        message = "Unauthorized. Check email and password.";
      } else if (!err?.response) {
        message =
          "Cannot reach backend. Check backend URL, IP address, firewall, or network.";
      }

      // Pending / rejected / suspended facility or deactivated account
      if (status === 403) {
        setBlockedNotice(message);
        return;
      }

      showMessage("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  const openStatusCheck = () => {
    router.push({
      pathname: "/register-facility",
      params: { mode: "status", email: email.trim().toLowerCase() },
    });
  };

  if (authLoading) {
    return (
      <View style={styles.loadingBox}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Checking saved session...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.page}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.card}>
          <Text style={styles.brand}>🧠 MedTrack</Text>
          <Text style={styles.title}>Sign in</Text>
          <Text style={styles.subtitle}>
            Facility workflow, billing and enrollment
          </Text>

          {__DEV__ ? (
            <Text style={styles.debug}>API: {API_BASE_URL}</Text>
          ) : null}

          <InputField
            placeholder="Email"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoComplete="email"
            keyboardType="email-address"
          />

          <InputField
            placeholder="Password"
            secureTextEntry
            value={password}
            onChangeText={setPassword}
          />

          <Button
            title={loading ? "Logging in..." : "Login"}
            onPress={handleLogin}
          />

          {blockedNotice ? (
            <View style={styles.noticeBox}>
              <Text style={styles.noticeTitle}>Access not available yet</Text>
              <Text style={styles.noticeText}>{blockedNotice}</Text>
              <TouchableOpacity onPress={openStatusCheck}>
                <Text style={styles.noticeLink}>
                  Check registration status →
                </Text>
              </TouchableOpacity>
            </View>
          ) : null}

          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>New to MedTrack?</Text>
            <View style={styles.dividerLine} />
          </View>

          <TouchableOpacity
            style={styles.registerBtn}
            onPress={() => router.push("/register-facility")}
            activeOpacity={0.85}
          >
            <Text style={styles.registerBtnText}>
              🏥 Register your facility
            </Text>
          </TouchableOpacity>

          <Text style={styles.registerHint}>
            Hospitals · Clinics · Pharmacies · Drug shops · Diagnostic centres ·
            Maternity homes
          </Text>

          <TouchableOpacity
            style={styles.statusLink}
            onPress={openStatusCheck}
          >
            <Text style={styles.statusLinkText}>
              Already registered? Check approval status
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  loadingBox: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  loadingText: { marginTop: 10, color: "#6b7280" },

  page: { padding: 20, paddingTop: 50, paddingBottom: 40 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 22,
    maxWidth: 460,
    width: "100%",
    alignSelf: "center",
  },

  brand: { fontSize: 15, fontWeight: "700", color: "#2563eb" },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: "#111827",
    marginTop: 8,
  },
  subtitle: { fontSize: 14, color: "#6b7280", marginTop: 4, marginBottom: 18 },
  debug: { fontSize: 11, color: "#9ca3af", marginBottom: 12 },

  noticeBox: {
    backgroundColor: "#fffbeb",
    borderLeftWidth: 3,
    borderLeftColor: "#f59e0b",
    borderRadius: 8,
    padding: 12,
    marginTop: 16,
  },
  noticeTitle: { fontSize: 13, fontWeight: "700", color: "#92400e" },
  noticeText: {
    fontSize: 13,
    color: "#92400e",
    marginTop: 4,
    lineHeight: 19,
  },
  noticeLink: {
    fontSize: 13,
    fontWeight: "700",
    color: "#b45309",
    marginTop: 8,
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 24,
    marginBottom: 16,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: "#e5e7eb" },
  dividerText: { fontSize: 12, color: "#9ca3af", fontWeight: "600" },

  registerBtn: {
    borderWidth: 1.5,
    borderColor: "#2563eb",
    backgroundColor: "#eff6ff",
    borderRadius: 8,
    paddingVertical: 13,
    alignItems: "center",
  },
  registerBtnText: { fontSize: 15, fontWeight: "700", color: "#1d4ed8" },
  registerHint: {
    fontSize: 11,
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 16,
  },

  statusLink: { paddingVertical: 14, alignItems: "center", marginTop: 4 },
  statusLinkText: { fontSize: 13, color: "#2563eb", fontWeight: "600" },
});
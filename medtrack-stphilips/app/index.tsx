import React, { useState, useContext, useEffect } from "react";
import {
  View,
  Text,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  ActivityIndicator,
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

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (user?.role) {
      const home = getHomeRouteForRole(user.role);
      console.log("Already logged in, redirecting to:", home);
      router.replace(home);
    }
  }, [user, authLoading, router]);

  const handleLogin = async () => {
    if (!email || !password) {
      showMessage("Error", "Please enter email and password");
      return;
    }

    try {
      setLoading(true);

      console.log("Attempting login with API URL:", API_BASE_URL);

      const result: any = await login(email, password);

      console.log("Login result:", result);

      const role = result?.user?.role;
      const home = getHomeRouteForRole(role);

      console.log("Redirecting to:", home);

      showMessage("Success", `Logged in as ${role || "user"}`);

      router.replace(home);
    } catch (err: any) {
      console.log("LOGIN ERROR FULL:", err?.response || err?.message || err);

      const status = err?.response?.status;
      const data = err?.response?.data;

      let message =
        data?.error ||
        data?.message ||
        err?.message ||
        "Invalid credentials";

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

      showMessage("Login Failed", message);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          backgroundColor: "#f9fafb",
        }}
      >
        <ActivityIndicator size="large" />
        <Text style={{ marginTop: 10, color: "#6b7280" }}>
          Checking saved session...
        </Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView contentContainerStyle={{ padding: 20, marginTop: 60 }}>
        <Text style={{ fontSize: 24, fontWeight: "bold", marginBottom: 8 }}>
          St. Philips Login
        </Text>

        <Text style={{ color: "#6b7280", marginBottom: 20 }}>
          API URL: {API_BASE_URL}
        </Text>

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
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
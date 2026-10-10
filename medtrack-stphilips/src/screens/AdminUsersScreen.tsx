import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  Platform,
  Alert,
  KeyboardAvoidingView,
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

const ROLES = [
  "admin",
  "reception",
  "doctor",
  "lab",
  "billing",
  "pharmacist",
  "staff",
];

type User = {
  _id: string;
  name?: string;
  email?: string;
  role?: string;
  createdAt?: string;
  updatedAt?: string;
};

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

function formatDate(value?: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export default function AdminUsersScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [formMode, setFormMode] = useState<
    "create" | "edit" | "password" | null
  >(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("staff");

  const [saving, setSaving] = useState(false);

  const loadUsers = useCallback(
    async (isRefresh = false) => {
      if (!user) {
        setLoading(false);
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
        const res = await API.get("/admin/users");

        setUsers(Array.isArray(res.data?.users) ? res.data.users : []);
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load users";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (status === 403) {
          setError(
            message ||
              "Only administrators can access user management."
          );
          setUsers([]);
          return;
        }

        setError(message);
        setUsers([]);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [logout, router, user]
  );

  useEffect(() => {
    loadUsers(false);
  }, [loadUsers]);

  const resetForm = () => {
    setFormMode(null);
    setSelectedUser(null);
    setName("");
    setEmail("");
    setPassword("");
    setRole("staff");
    setError(null);
    setSuccess(null);
  };

  const startCreate = () => {
    resetForm();
    setFormMode("create");
  };

  const startEdit = (u: User) => {
    setSelectedUser(u);
    setName(u.name || "");
    setEmail(u.email || "");
    setRole(u.role || "staff");
    setPassword("");
    setError(null);
    setSuccess(null);
    setFormMode("edit");
  };

  const startPassword = (u: User) => {
    setSelectedUser(u);
    setPassword("");
    setError(null);
    setSuccess(null);
    setFormMode("password");
  };

  const save = async () => {
    if (!formMode) {
      return;
    }

    const cleanName = name.trim();
    const cleanEmail = email.trim().toLowerCase();
    const cleanPassword = password.trim();
    const cleanRole = role.trim();

    if (formMode === "create") {
      if (!cleanName) {
        showMessage("Required", "Name is required.");
        return;
      }

      if (!cleanEmail) {
        showMessage("Required", "Email is required.");
        return;
      }

      if (!isValidEmail(cleanEmail)) {
        showMessage("Invalid email", "Enter a valid email address.");
        return;
      }

      if (!cleanPassword || cleanPassword.length < 6) {
        showMessage(
          "Invalid password",
          "Password must be at least 6 characters."
        );
        return;
      }

      if (!ROLES.includes(cleanRole)) {
        showMessage("Invalid role", "Select a valid role.");
        return;
      }
    }

    if (formMode === "edit") {
      if (!cleanName) {
        showMessage("Required", "Name is required.");
        return;
      }

      if (!cleanEmail) {
        showMessage("Required", "Email is required.");
        return;
      }

      if (!isValidEmail(cleanEmail)) {
        showMessage("Invalid email", "Enter a valid email address.");
        return;
      }

      if (!ROLES.includes(cleanRole)) {
        showMessage("Invalid role", "Select a valid role.");
        return;
      }
    }

    if (formMode === "password") {
      if (!cleanPassword || cleanPassword.length < 6) {
        showMessage(
          "Invalid password",
          "Password must be at least 6 characters."
        );
        return;
      }
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      if (formMode === "create") {
        await API.post("/admin/users", {
          name: cleanName,
          email: cleanEmail,
          password: cleanPassword,
          role: cleanRole,
        });

        setSuccess("User created successfully.");
      } else if (formMode === "edit") {
        await API.put(`/admin/users/${selectedUser?._id}`, {
          name: cleanName,
          email: cleanEmail,
          role: cleanRole,
        });

        setSuccess("User updated successfully.");
      } else if (formMode === "password") {
        await API.put(`/admin/users/${selectedUser?._id}`, {
          password: cleanPassword,
        });

        setSuccess("Password reset successfully.");
      }

      resetForm();
      await loadUsers(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to save user";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
      showMessage("Save failed", message);
    } finally {
      setSaving(false);
    }
  };

  const isSelf = selectedUser?._id === user?._id;
  const roleButtonsDisabled = formMode === "edit" && isSelf;

  if (loading) {
    return (
      <LoadingState
        title="Loading users..."
        subtitle="Please wait while staff accounts load."
      />
    );
  }

  if (error && users.length === 0) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadUsers(false)}
      />
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        style={styles.screen}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadUsers(true)}
          />
        }
      >
        <Text style={styles.title}>🧑‍💼 User Management</Text>

        <Text style={styles.subtitle}>
          Admin can create staff accounts, update roles, and reset passwords.
        </Text>

        <Text style={styles.metaText}>
          Logged in as: {user?.name || "Admin"} | Role:{" "}
          {user?.role || "admin"}
        </Text>

        <ErrorBanner message={error} />
        <SuccessBanner message={success} />

        {!formMode ? (
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={startCreate}
            disabled={saving}
          >
            <Text style={styles.primaryButtonText}>Create New User</Text>
          </TouchableOpacity>
        ) : null}

        {formMode ? (
          <View style={styles.formCard}>
            <Text style={styles.formTitle}>
              {formMode === "create"
                ? "Create User"
                : formMode === "edit"
                ? "Edit User"
                : "Reset Password"}
            </Text>

            {formMode === "password" && selectedUser ? (
              <>
                <Text style={styles.detail}>
                  User: {selectedUser.name || "—"}
                </Text>

                <Text style={styles.detail}>
                  Email: {selectedUser.email || "—"}
                </Text>
              </>
            ) : null}

            {formMode !== "password" ? (
              <>
                <Text style={styles.label}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={setName}
                  placeholder="Full name"
                  autoCapitalize="words"
                  editable={!saving}
                />

                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={styles.input}
                  value={email}
                  onChangeText={setEmail}
                  placeholder="email@example.com"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!saving}
                />
              </>
            ) : null}

            {formMode === "create" ? (
              <>
                <Text style={styles.label}>Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  secureTextEntry
                  editable={!saving}
                />
              </>
            ) : null}

            {formMode === "password" ? (
              <>
                <Text style={styles.label}>New Password</Text>
                <TextInput
                  style={styles.input}
                  value={password}
                  onChangeText={setPassword}
                  placeholder="At least 6 characters"
                  secureTextEntry
                  editable={!saving}
                />
              </>
            ) : null}

            {formMode !== "password" ? (
              <>
                <Text style={styles.label}>Role</Text>

                {isSelf ? (
                  <Text style={styles.warningText}>
                    You cannot change your own role.
                  </Text>
                ) : null}

                <View style={styles.roleGrid}>
                  {ROLES.map((r) => {
                    const active = role === r;

                    return (
                      <TouchableOpacity
                        key={r}
                        disabled={roleButtonsDisabled || saving}
                        onPress={() => setRole(r)}
                        style={[
                          styles.roleButton,
                          active && styles.roleButtonActive,
                          (roleButtonsDisabled || saving) &&
                            styles.disabledButton,
                        ]}
                      >
                        <Text
                          style={[
                            styles.roleText,
                            active && styles.roleTextActive,
                          ]}
                        >
                          {r}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </>
            ) : null}

            <TouchableOpacity
              style={[styles.primaryButton, saving && styles.disabledButton]}
              onPress={save}
              disabled={saving}
            >
              {saving ? (
                <View style={styles.buttonContent}>
                  <ActivityIndicator color="#fff" />
                  <Text style={styles.primaryButtonText}>Saving...</Text>
                </View>
              ) : (
                <Text style={styles.primaryButtonText}>
                  {formMode === "create"
                    ? "Create User"
                    : formMode === "edit"
                    ? "Update User"
                    : "Reset Password"}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={resetForm}
              disabled={saving}
            >
              <Text style={styles.secondaryButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.sectionTitleRow}>
          <Text style={styles.sectionTitle}>All Users</Text>
        </View>

        {users.length === 0 ? (
          <EmptyState
            title="No users found."
            subtitle="Create the first staff account above."
          />
        ) : (
          users.map((u) => {
            const self = u._id === user?._id;

            return (
              <View key={u._id} style={styles.userCard}>
                <Text style={styles.userName}>
                  {u.name || "Unnamed User"}
                  {self ? " (You)" : ""}
                </Text>

                <Text style={styles.detail}>
                  Email: {u.email || "—"}
                </Text>

                <Text style={styles.detail}>
                  Role: {u.role || "—"}
                </Text>

                <Text style={styles.detail}>
                  Created: {formatDate(u.createdAt)}
                </Text>

                <View style={styles.actionsRow}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => startEdit(u)}
                    disabled={saving}
                  >
                    <Text style={styles.actionButtonText}>Edit</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[styles.actionButton, styles.passwordButton]}
                    onPress={() => startPassword(u)}
                    disabled={saving}
                  >
                    <Text style={styles.actionButtonText}>
                      Reset Password
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          })
        )}
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

  sectionTitleRow: {
    marginTop: 20,
    marginBottom: 10,
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },

  formCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#2563eb",
    marginBottom: 16,
  },

  formTitle: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    marginBottom: 6,
    color: "#111827",
  },

  input: {
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 12,
    fontSize: 15,
  },

  roleGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },

  roleButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#e5e7eb",
  },

  roleButtonActive: {
    backgroundColor: "#2563eb",
  },

  roleText: {
    color: "#111827",
    fontWeight: "600",
  },

  roleTextActive: {
    color: "#ffffff",
  },

  disabledButton: {
    opacity: 0.6,
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

  userCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  userName: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 8,
  },

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  actionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 10,
  },

  actionButton: {
    flex: 1,
    minWidth: 140,
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  passwordButton: {
    backgroundColor: "#b45309",
  },

  actionButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },

  warningText: {
    color: "#b45309",
    marginBottom: 10,
    fontWeight: "600",
  },
});
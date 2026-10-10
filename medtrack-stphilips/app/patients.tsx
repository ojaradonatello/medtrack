import React, { useContext, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";

import { useRouter } from "expo-router";

import API from "../src/services/api";
import { AuthContext } from "../src/context/AuthContext";

import {
  ErrorBanner,
  EmptyState,
} from "../src/components/StateView";

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

type SearchResult = {
  patient: Patient;
  activeVisit: ActiveVisit | null;
  canCreateNewVisit: boolean;
};

function humanize(value?: string) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

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

export default function PatientsScreen() {
  const router = useRouter();
  const { logout } = useContext(AuthContext);

  const [search, setSearch] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = async (term: string = search, isRefresh = false) => {
    const cleanTerm = term.trim();

    if (!cleanTerm) {
      setError("Enter a patient name or phone number");
      setResults([]);
      setSearched(true);
      return;
    }

    if (!isRefresh) {
      setLoading(true);
    } else {
      setRefreshing(true);
    }

    setError(null);

    try {
      const res = await API.get("/patients/search", {
        params: {
          name: cleanTerm,
        },
      });

      setResults(Array.isArray(res.data?.results) ? res.data.results : []);
      setSearched(true);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to search patients";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
      setResults([]);
      setSearched(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = async () => {
    if (!search.trim()) {
      return;
    }

    await runSearch(search, true);
  };

  const openHistory = (patient: Patient) => {
    router.push(
      `/patient-history?id=${encodeURIComponent(
        patient._id
      )}&name=${encodeURIComponent(patient.name || "")}`
    );
  };

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <Text style={styles.title}>👥 Patient Search</Text>

      <Text style={styles.subtitle}>
        Search by name or phone. Example: mary, james, opi, 0722
      </Text>

      <View style={styles.searchRow}>
        <TextInput
          style={styles.input}
          placeholder="Search patient name or phone"
          value={search}
          onChangeText={setSearch}
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={() => runSearch(search)}
          returnKeyType="search"
          editable={!loading}
        />

        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => runSearch(search)}
          disabled={loading}
        >
          <Text style={styles.searchButtonText}>
            {loading ? "Searching..." : "Search"}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.inlineLoading}>
          <ActivityIndicator size="large" color="#2563eb" />
          <Text style={styles.inlineLoadingText}>
            Searching patients...
          </Text>
        </View>
      ) : null}

      <ErrorBanner message={error} />

      {!loading && searched && results.length === 0 && !error ? (
        <EmptyState
          title="No patients found."
          subtitle="Try another name or phone number."
        />
      ) : null}

      {!loading &&
        results.map((item) => {
          const patient = item.patient;
          const activeVisit = item.activeVisit;

          return (
            <View key={patient._id} style={styles.card}>
              <Text style={styles.patientName}>{patient.name}</Text>

              <Text style={styles.detail}>
                Age: {patient.age ?? "—"}
              </Text>

              <Text style={styles.detail}>
                Gender: {patient.gender ?? "—"}
              </Text>

              <Text style={styles.detail}>
                Phone: {patient.phone ?? "—"}
              </Text>

              <Text style={styles.detail}>
                Address: {patient.address ?? "—"}
              </Text>

              <View style={styles.divider} />

              {activeVisit ? (
                <>
                  <Text style={styles.activeVisitText}>
                    Active Visit: {humanize(activeVisit.status)}
                  </Text>

                  <Text style={styles.detail}>
                    Department: {humanize(activeVisit.currentDepartment)}
                  </Text>

                  {activeVisit.visitNumber && (
                    <Text style={styles.detail}>
                      Visit Number: {activeVisit.visitNumber}
                    </Text>
                  )}

                  {activeVisit.notes && (
                    <Text style={styles.noteText}>
                      Note: {activeVisit.notes}
                    </Text>
                  )}

                  <Text style={styles.cannotCreateText}>
                    Can create new visit: No
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.noVisitText}>
                    Active Visit: None
                  </Text>

                  <Text style={styles.canCreateText}>
                    Can create new visit: Yes
                  </Text>
                </>
              )}

              <View style={styles.divider} />

              <TouchableOpacity
                style={styles.historyButton}
                onPress={() => openHistory(patient)}
              >
                <Text style={styles.historyButtonText}>
                  View Visit History
                </Text>
              </TouchableOpacity>
            </View>
          );
        })}
    </ScrollView>
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
    marginBottom: 16,
  },

  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 16,
  },

  input: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#d1d5db",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    fontSize: 15,
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
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  patientName: {
    fontSize: 18,
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
    marginVertical: 10,
  },

  activeVisitText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#b45309",
    marginBottom: 4,
  },

  noVisitText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#047857",
    marginBottom: 4,
  },

  canCreateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#047857",
  },

  cannotCreateText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#b91c1c",
  },

  noteText: {
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 4,
  },

  historyButton: {
    backgroundColor: "#111827",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },

  historyButtonText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
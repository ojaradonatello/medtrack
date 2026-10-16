import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
  StyleSheet,
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

import {
  LoadingState,
  ErrorState,
  ErrorBanner,
  EmptyState,
} from "../components/StateView";

const ACTIVE_STATUSES = [
  "registered",
  "waiting_consultation",
  "in_consultation",
  "waiting_lab",
  "lab_in_progress",
  "waiting_interpretation",
  "waiting_billing",
  "waiting_dispensary",
];

function humanize(value?: string) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function formatDate(value?: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case "waiting_consultation":
      return "#2563eb";
    case "in_consultation":
      return "#7c3aed";
    case "waiting_lab":
      return "#0891b2";
    case "lab_in_progress":
      return "#0e7490";
    case "waiting_interpretation":
      return "#b45309";
    case "waiting_billing":
      return "#ca8a04";
    case "waiting_dispensary":
      return "#16a34a";
    case "completed":
      return "#15803d";
    case "cancelled":
      return "#b91c1c";
    case "no_show":
      return "#6b7280";
    default:
      return "#374151";
  }
}

function getResultColor(status?: string) {
  switch (status) {
    case "normal":
      return "#16a34a";
    case "abnormal":
      return "#b45309";
    case "critical":
      return "#b91c1c";
    case "pending":
      return "#6b7280";
    default:
      return "#374151";
  }
}

export default function PatientHistoryScreen() {
  const router = useRouter();
  const { logout } = useContext(AuthContext);

  const params = useLocalSearchParams();

  const patientId = Array.isArray(params.id) ? params.id[0] : params.id;
  const passedName = Array.isArray(params.name)
    ? params.name[0]
    : params.name;

  const [patient, setPatient] = useState<any | null>(null);
  const [visits, setVisits] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadHistory = useCallback(
    async (isRefresh = false) => {
      if (!patientId) {
        setError("No patient ID provided.");
        setLoading(false);
        return;
      }

      if (!isRefresh) {
        setLoading(true);
      } else {
        setRefreshing(true);
      }

      setError(null);

      try {
        const res = await API.get(`/patients/${patientId}/visits`);

        setPatient(res.data?.patient || null);
        setVisits(Array.isArray(res.data?.visits) ? res.data.visits : []);
        setTotal(Number(res.data?.total || 0));
      } catch (err: any) {
        const status = err?.response?.status;
        const data = err?.response?.data;

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        if (status === 403) {
          setError(
            data?.error ||
              "You do not have permission to view patient history."
          );
          return;
        }

        setError(
          data?.error ||
            err?.message ||
            "Failed to load patient history."
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [logout, patientId, router]
  );

  useEffect(() => {
    loadHistory(false);
  }, [loadHistory]);

  const displayName = patient?.name || passedName || "Patient";

  if (loading) {
    return (
      <LoadingState
        title="Loading patient history..."
        subtitle="Please wait while visit records load."
      />
    );
  }

  if (error && !patient && visits.length === 0) {
    return (
      <ErrorState
        message={error}
        onRetry={patientId ? () => loadHistory(false) : undefined}
      />
    );
  }

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => loadHistory(true)}
        />
      }
    >
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>📜 Patient Visit History</Text>

      <ErrorBanner message={error} />

      <View style={styles.patientCard}>
        <Text style={styles.patientName}>{displayName}</Text>

        <Text style={styles.detail}>
          Patient ID: {patient?._id || patientId || "—"}
        </Text>

        <Text style={styles.detail}>
          Phone: {patient?.phone || "—"}
        </Text>

        <Text style={styles.detail}>
          Gender: {patient?.gender || "—"}
        </Text>

        <Text style={styles.detail}>
          Age: {patient?.age ?? "—"}
        </Text>

        <Text style={styles.detail}>
          Address: {patient?.address || "—"}
        </Text>

        <Text style={styles.detail}>
          Tribe: {patient?.tribe || "—"}
        </Text>

        <Text style={styles.detail}>
          Next of Kin: {patient?.nextOfKinName || "—"}
        </Text>

        <Text style={styles.detail}>
          Next of Kin Phone: {patient?.nextOfKinPhone || "—"}
        </Text>

        <View style={styles.divider} />

        <Text style={styles.summaryText}>
          Total visits: {total}
        </Text>
      </View>

      {!error && visits.length === 0 ? (
        <EmptyState
          title="No visits recorded for this patient yet."
          subtitle="Pull down to refresh."
        />
      ) : null}

      {visits.map((visit, index) => {
        const isActive = ACTIVE_STATUSES.includes(visit.status);

        return (
          <View key={visit._id || index} style={styles.visitCard}>
            <View style={styles.visitHeader}>
              <Text style={styles.visitTitle}>
                Visit #{visits.length - index}
              </Text>

              {isActive ? (
                <View style={styles.activeTag}>
                  <Text style={styles.activeTagText}>Active</Text>
                </View>
              ) : null}
            </View>

            <Text style={styles.detail}>
              Visit Number: {visit.visitNumber || "—"}
            </Text>

            <View
              style={[
                styles.statusBadge,
                { backgroundColor: getStatusColor(visit.status) },
              ]}
            >
              <Text style={styles.statusText}>
                {humanize(visit.status)}
              </Text>
            </View>

            <Text style={styles.detail}>
              Department: {humanize(visit.currentDepartment)}
            </Text>

            {visit.notes ? (
              <Text style={styles.note}>
                Note: {visit.notes}
              </Text>
            ) : null}

            <View style={styles.divider} />

            <Text style={styles.detail}>
              Created: {formatDate(visit.createdAt)}
            </Text>

            <Text style={styles.detail}>
              Started: {formatDate(visit.startedAt)}
            </Text>

            <Text style={styles.detail}>
              Completed: {formatDate(visit.completedAt)}
            </Text>

            <Text style={styles.detail}>
              Last updated: {formatDate(visit.updatedAt)}
            </Text>

            {visit.vitals && Object.keys(visit.vitals).length > 0 ? (
              <>
                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>Vitals</Text>

                {visit.vitals.bloodPressure ? (
                  <Text style={styles.detail}>
                    Blood Pressure:{" "}
                    {visit.vitals.bloodPressure.systolic}/
                    {visit.vitals.bloodPressure.diastolic}
                  </Text>
                ) : null}

                {visit.vitals.temperatureC !== undefined ? (
                  <Text style={styles.detail}>
                    Temperature: {visit.vitals.temperatureC} °C
                  </Text>
                ) : null}

                {visit.vitals.pulseBpm !== undefined ? (
                  <Text style={styles.detail}>
                    Pulse: {visit.vitals.pulseBpm} bpm
                  </Text>
                ) : null}

                {visit.vitals.weightKg !== undefined ? (
                  <Text style={styles.detail}>
                    Weight: {visit.vitals.weightKg} kg
                  </Text>
                ) : null}
              </>
            ) : null}

            {visit.labResults && visit.labResults.length > 0 ? (
              <>
                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>Laboratory Results</Text>

                {visit.labResults.map((result: any, resultIndex: number) => (
                  <View
                    key={`${result.testName || "result"}-${resultIndex}`}
                    style={styles.resultPreview}
                  >
                    <Text style={styles.resultPreviewName}>
                      {result.testName || "Unknown test"}
                    </Text>

                    <Text style={styles.resultPreviewValue}>
                      Result: {result.resultValue || "—"}
                    </Text>

                    {result.unit ? (
                      <Text style={styles.detail}>
                        Unit: {result.unit}
                      </Text>
                    ) : null}

                    {result.referenceRange ? (
                      <Text style={styles.detail}>
                        Reference: {result.referenceRange}
                      </Text>
                    ) : null}

                    {result.status ? (
                      <View
                        style={[
                          styles.resultStatusBadge,
                          {
                            backgroundColor: getResultColor(result.status),
                          },
                        ]}
                      >
                        <Text style={styles.resultStatusText}>
                          {humanize(result.status)}
                        </Text>
                      </View>
                    ) : null}

                    {result.notes ? (
                      <Text style={styles.note}>{result.notes}</Text>
                    ) : null}

                    {result.performedAt ? (
                      <Text style={styles.detail}>
                        Recorded: {formatDate(result.performedAt)}
                      </Text>
                    ) : null}
                  </View>
                ))}
              </>
            ) : null}


                      {visit.prescriptions && visit.prescriptions.length > 0 ? (
              <>
                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>Prescriptions</Text>

                {visit.prescriptions.map(
                  (rx: any, rxIndex: number) => (
                    <View
                      key={`${rx.drugName || "rx"}-${rxIndex}`}
                      style={styles.resultPreview}
                    >
                      <Text style={styles.resultPreviewName}>
                        {rx.drugName || "Unknown medicine"}
                        {rx.strength ? ` ${rx.strength}` : ""}
                      </Text>

                      <Text style={styles.resultPreviewValue}>
                        Quantity: {rx.quantity ?? "—"}
                      </Text>

                      {rx.dosage ? (
                        <Text style={styles.detail}>
                          Dosage: {rx.dosage}
                        </Text>
                      ) : null}

                      {rx.frequency ? (
                        <Text style={styles.detail}>
                          Frequency: {rx.frequency}
                        </Text>
                      ) : null}

                      {rx.duration ? (
                        <Text style={styles.detail}>
                          Duration: {rx.duration}
                        </Text>
                      ) : null}

                      {rx.instructions ? (
                        <Text style={styles.note}>
                          Instructions: {rx.instructions}
                        </Text>
                      ) : null}

                      {rx.prescribedAt ? (
                        <Text style={styles.detail}>
                          Prescribed: {formatDate(rx.prescribedAt)}
                        </Text>
                      ) : null}
                    </View>
                  )
                )}
              </>
            ) : null}


            {visit.visitSummary &&
            Object.keys(visit.visitSummary).length > 0 ? (
              <>
                <View style={styles.divider} />

                <Text style={styles.sectionLabel}>
                  Visit Summary / Discharge Note
                </Text>

                {visit.visitSummary.diagnosis ? (
                  <Text style={styles.detail}>
                    Diagnosis: {visit.visitSummary.diagnosis}
                  </Text>
                ) : null}

                {visit.visitSummary.treatmentGiven ? (
                  <Text style={styles.detail}>
                    Treatment Given:{" "}
                    {visit.visitSummary.treatmentGiven}
                  </Text>
                ) : null}

                {visit.visitSummary.advice ? (
                  <Text style={styles.detail}>
                    Advice: {visit.visitSummary.advice}
                  </Text>
                ) : null}

                {visit.visitSummary.dischargeStatus ? (
                  <Text style={styles.detail}>
                    Discharge Status:{" "}
                    {humanize(visit.visitSummary.dischargeStatus)}
                  </Text>
                ) : null}

                {visit.visitSummary.summaryNote ? (
                  <Text style={styles.note}>
                    Summary Note:{" "}
                    {visit.visitSummary.summaryNote}
                  </Text>
                ) : null}

                {visit.visitSummary.followUpDate ? (
                  <Text style={styles.detail}>
                    Follow-up Date:{" "}
                    {formatDate(visit.visitSummary.followUpDate)}
                  </Text>
                ) : null}

                {visit.visitSummary.createdAt ? (
                  <Text style={styles.detail}>
                    Summary Recorded:{" "}
                    {formatDate(visit.visitSummary.createdAt)}
                  </Text>
                ) : null}
              </>
            ) : null}
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

  backButton: {
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: "#e5e7eb",
  },

  backButtonText: {
    color: "#111827",
    fontWeight: "600",
  },

  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
  },

  patientCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  patientName: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
  },

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  summaryText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },

  visitCard: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  visitHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  visitTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },

  activeTag: {
    backgroundColor: "#dbeafe",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },

  activeTagText: {
    color: "#1d4ed8",
    fontWeight: "bold",
    fontSize: 12,
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 8,
  },

  statusText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 13,
  },

  note: {
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
    marginTop: 4,
    marginBottom: 4,
  },

  sectionLabel: {
    fontSize: 15,
    fontWeight: "bold",
    marginBottom: 6,
    color: "#111827",
  },

  resultPreview: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },

  resultPreviewName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },

  resultPreviewValue: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 8,
  },

  resultStatusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    marginBottom: 8,
  },

  resultStatusText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
  },
});
import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Platform,
  Alert,
  StyleSheet,
} from "react-native";

import { useRouter, useLocalSearchParams } from "expo-router";

import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

import {
  LoadingState,
  ErrorState,
  ErrorBanner,
} from "../components/StateView";

const ALLOWED_ROLES = [
  "admin",
  "reception",
  "doctor",
  "lab",
  "pharmacist",
  "staff",
];

function formatDate(value?: string) {
  if (!value) return "—";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function humanize(value?: string) {
  if (!value) return "—";
  return value.replace(/_/g, " ");
}

function escapeHtml(value: any) {
  const text =
    value === undefined || value === null || value === ""
      ? "—"
      : String(value);

  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function row(label: string, value: any) {
  return `
    <tr>
      <td class="label">${escapeHtml(label)}</td>
      <td>${escapeHtml(value)}</td>
    </tr>
  `;
}

function buildMedicalFormHtml(visit: any) {
  const patient = visit?.patient || {};
  const vitals = visit?.vitals || {};
  const bp = vitals?.bloodPressure || {};
  const summary = visit?.visitSummary || {};

  const procedures = Array.isArray(visit?.procedures)
    ? visit.procedures
    : [];

  const labResults = Array.isArray(visit?.labResults)
    ? visit.labResults
    : [];

  const prescriptions = Array.isArray(visit?.prescriptions)
    ? visit.prescriptions
    : [];

  const proceduresHtml =
    procedures.length === 0
      ? `<tr><td colspan="6">None recorded</td></tr>`
      : procedures
          .map(
            (proc: any) => `
              <tr>
                <td>${escapeHtml(proc.procedureName)}</td>
                <td>${escapeHtml(proc.treatmentGiven)}</td>
                <td>${proc.emergency ? "Yes" : "No"}</td>
                <td>${escapeHtml(proc.outcome)}</td>
                <td>${escapeHtml(proc.notes)}</td>
                <td>${escapeHtml(formatDate(proc.performedAt))}</td>
              </tr>
            `
          )
          .join("");

  const labHtml =
    labResults.length === 0
      ? `<tr><td colspan="5">None recorded</td></tr>`
      : labResults
          .map(
            (result: any) => `
              <tr>
                <td>${escapeHtml(result.testName)}</td>
                <td>${escapeHtml(result.resultValue)}</td>
                <td>${escapeHtml(humanize(result.status))}</td>
                <td>${escapeHtml(result.notes)}</td>
                <td>${escapeHtml(formatDate(result.performedAt))}</td>
              </tr>
            `
          )
          .join("");

  const prescriptionHtml =
    prescriptions.length === 0
      ? `<tr><td colspan="11">None recorded</td></tr>`
      : prescriptions
          .map((rx: any) => {
            const prescribed = Number(rx.quantity || 0);
            const dispensedQty = Number(rx.dispensedQuantity || 0);

            let dispenseLabel = "No";

            if (rx.dispensed === true) {
              dispenseLabel = "Yes";
            } else if (dispensedQty > 0) {
              dispenseLabel = "Partial";
            }

            return `
              <tr>
                <td>${escapeHtml(rx.drugName)}</td>
                <td>${escapeHtml(rx.strength)}</td>
                <td>${escapeHtml(prescribed || "—")}</td>
                <td>${escapeHtml(rx.dosage)}</td>
                <td>${escapeHtml(rx.frequency)}</td>
                <td>${escapeHtml(rx.duration)}</td>
                <td>${escapeHtml(rx.instructions)}</td>
                <td>${escapeHtml(dispenseLabel)}</td>
                <td>${escapeHtml(dispensedQty || 0)}</td>
                <td>${escapeHtml(rx.dispensedByName)}</td>
                <td>${escapeHtml(formatDate(rx.dispensedAt))}</td>
              </tr>
            `;
          })
          .join("");

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Medical Form - ${escapeHtml(patient.name || "Patient")}</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        padding: 24px;
        color: #111827;
        background: #ffffff;
      }

      .hospital-header {
        text-align: center;
        border-bottom: 2px solid #111827;
        padding-bottom: 12px;
        margin-bottom: 18px;
      }

      .hospital-name {
        font-size: 26px;
        font-weight: bold;
        margin: 0;
      }

      .form-title {
        font-size: 18px;
        margin-top: 6px;
        font-weight: bold;
      }

      .section {
        margin-top: 18px;
      }

      .section-title {
        font-size: 15px;
        font-weight: bold;
        margin-bottom: 8px;
        background: #f3f4f6;
        padding: 8px;
        border-left: 4px solid #2563eb;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 12px;
      }

      th, td {
        border: 1px solid #d1d5db;
        padding: 7px 8px;
        vertical-align: top;
      }

      th {
        background: #e5e7eb;
        text-align: left;
      }

      .label {
        width: 30%;
        font-weight: bold;
        background: #f9fafb;
      }

      .signature-area {
        margin-top: 36px;
      }

      .signature-grid {
        display: table;
        width: 100%;
        table-layout: fixed;
      }

      .signature-cell {
        display: table-cell;
        width: 20%;
        padding: 18px 8px 0 8px;
        vertical-align: bottom;
        text-align: center;
        font-size: 12px;
      }

      .signature-line {
        border-top: 1px solid #111827;
        margin-bottom: 6px;
        height: 35px;
      }

      .footer-note {
        margin-top: 24px;
        font-size: 11px;
        color: #6b7280;
        text-align: center;
      }

      @media print {
        body {
          padding: 0;
        }
      }
    </style>
  </head>

  <body>
    <div class="hospital-header">
      <div class="hospital-name">ST. PHILIPS HOSPITAL</div>
      <div class="form-title">Medical Form / Visit Summary</div>
    </div>

    <div class="section">
      <div class="section-title">Patient Information</div>
      <table>
        ${row("Patient Name", patient.name)}
        ${row("Phone", patient.phone)}
        ${row("Age", patient.age)}
        ${row("Gender", patient.gender)}
        ${row("Address", patient.address)}
        ${row("Tribe", patient.tribe)}
        ${row("Next of Kin", patient.nextOfKinName)}
        ${row("Next of Kin Phone", patient.nextOfKinPhone)}
      </table>
    </div>

    <div class="section">
      <div class="section-title">Visit Information</div>
      <table>
        ${row("Visit Number", visit?.visitNumber)}
        ${row("Status", humanize(visit?.status))}
        ${row("Department", humanize(visit?.currentDepartment))}
        ${row("Registered", formatDate(visit?.createdAt))}
        ${row("Started", formatDate(visit?.startedAt))}
        ${row("Completed", formatDate(visit?.completedAt))}
      </table>
    </div>

    <div class="section">
      <div class="section-title">Vitals</div>
      <table>
        ${row(
          "Blood Pressure",
          bp.systolic && bp.diastolic ? `${bp.systolic}/${bp.diastolic}` : "—"
        )}
        ${row(
          "Temperature",
          vitals.temperatureC !== undefined ? `${vitals.temperatureC} °C` : "—"
        )}
        ${row(
          "Pulse",
          vitals.pulseBpm !== undefined ? `${vitals.pulseBpm} bpm` : "—"
        )}
        ${row(
          "Weight",
          vitals.weightKg !== undefined ? `${vitals.weightKg} kg` : "—"
        )}
      </table>
    </div>

    <div class="section">
      <div class="section-title">Procedures / Treatments</div>
      <table>
        <thead>
          <tr>
            <th>Procedure</th>
            <th>Treatment Given</th>
            <th>Emergency</th>
            <th>Outcome</th>
            <th>Notes</th>
            <th>Recorded</th>
          </tr>
        </thead>
        <tbody>
          ${proceduresHtml}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Laboratory Results</div>
      <table>
        <thead>
          <tr>
            <th>Test</th>
            <th>Result</th>
            <th>Status</th>
            <th>Notes</th>
            <th>Recorded</th>
          </tr>
        </thead>
        <tbody>
          ${labHtml}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Prescriptions and Dispensing</div>
      <table>
        <thead>
          <tr>
            <th>Medicine</th>
            <th>Strength</th>
            <th>Qty</th>
            <th>Dosage</th>
            <th>Frequency</th>
            <th>Duration</th>
            <th>Instructions</th>
            <th>Dispensed</th>
            <th>Dispensed Qty</th>
            <th>Dispensed By</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          ${prescriptionHtml}
        </tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Diagnosis / Discharge Summary</div>
      <table>
        ${row("Diagnosis", summary.diagnosis)}
        ${row("Treatment Given", summary.treatmentGiven)}
        ${row("Advice / Follow-up", summary.advice)}
        ${row("Discharge Status", humanize(summary.dischargeStatus))}
        ${row("Summary Note", summary.summaryNote)}
        ${row("Follow-up Date", formatDate(summary.followUpDate))}
      </table>
    </div>

    <div class="signature-area">
      <div class="section-title">Signatures</div>
      <div class="signature-grid">
        <div class="signature-cell">
          <div class="signature-line"></div>
          Doctor
        </div>
        <div class="signature-cell">
          <div class="signature-line"></div>
          Treatment Officer
        </div>
        <div class="signature-cell">
          <div class="signature-line"></div>
          Pharmacist
        </div>
        <div class="signature-cell">
          <div class="signature-line"></div>
          Reception / Billing
        </div>
        <div class="signature-cell">
          <div class="signature-line"></div>
          Patient / Guardian
        </div>
      </div>
    </div>

    <div class="footer-note">
      Generated on ${escapeHtml(new Date().toLocaleString())}
    </div>
  </body>
</html>
  `;
}

export default function MedicalFormScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, logout } = useContext(AuthContext);

  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const visitId = rawId;

  const [visit, setVisit] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowed = ALLOWED_ROLES.includes(user?.role || "");

  const loadVisit = useCallback(async () => {
    if (!visitId) {
      setError("No visit ID provided.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await API.get(`/visits/${visitId}`);
      setVisit(res.data);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load medical form";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [logout, router, visitId]);

  useEffect(() => {
    loadVisit();
  }, [loadVisit]);

  const printForm = () => {
    if (!visit) {
      Alert.alert("Error", "No medical form data available.");
      return;
    }

    if (Platform.OS !== "web") {
      Alert.alert(
        "Printing available on web",
        "Please open this system in a browser to print the medical form."
      );
      return;
    }

    const browserWindow = globalThis as any;

    const win = browserWindow.window.open(
      "",
      "_blank",
      "width=950,height=750"
    );

    if (!win) {
      Alert.alert(
        "Popup blocked",
        "Please allow popups for localhost so the medical form can print."
      );
      return;
    }

    const html = buildMedicalFormHtml(visit);

    win.document.open();
    win.document.write(html);
    win.document.close();
    win.focus();

    setTimeout(() => {
      win.print();
    }, 400);
  };

  if (loading) {
    return (
      <LoadingState
        title="Loading medical form..."
        subtitle="Please wait while the visit summary loads."
      />
    );
  }

  if (!allowed) {
    return (
      <ErrorState
        message="You do not have permission to view the medical form."
        onRetry={() => router.back()}
      />
    );
  }

  if (error && !visit) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadVisit()}
      />
    );
  }

  const patient = visit?.patient || {};
  const summary = visit?.visitSummary || {};
  const prescriptions = Array.isArray(visit?.prescriptions)
    ? visit.prescriptions
    : [];
  const labResults = Array.isArray(visit?.labResults)
    ? visit.labResults
    : [];
  const procedures = Array.isArray(visit?.procedures)
    ? visit.procedures
    : [];

  return (
    <ScrollView style={styles.screen}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>🧾 Medical Form / Visit Summary</Text>

      <Text style={styles.subtitle}>
        Review the clinical summary and print the patient medical form.
      </Text>

      <ErrorBanner message={error} />

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Patient</Text>

        <Text style={styles.detail}>
          Name: {patient.name || "—"}
        </Text>

        <Text style={styles.detail}>
          Phone: {patient.phone || "—"}
        </Text>

        <Text style={styles.detail}>
          Age: {patient.age ?? "—"}
        </Text>

        <Text style={styles.detail}>
          Gender: {patient.gender || "—"}
        </Text>

        <Text style={styles.detail}>
          Address: {patient.address || "—"}
        </Text>

        <Text style={styles.detail}>
          Tribe: {patient.tribe || "—"}
        </Text>

        <Text style={styles.detail}>
          Next of Kin: {patient.nextOfKinName || "—"}
        </Text>

        <Text style={styles.detail}>
          Next of Kin Phone: {patient.nextOfKinPhone || "—"}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Visit</Text>

        <Text style={styles.detail}>
          Visit Number: {visit?.visitNumber || "—"}
        </Text>

        <Text style={styles.detail}>
          Status: {humanize(visit?.status)}
        </Text>

        <Text style={styles.detail}>
          Department: {humanize(visit?.currentDepartment)}
        </Text>

        <Text style={styles.detail}>
          Registered: {formatDate(visit?.createdAt)}
        </Text>

        <Text style={styles.detail}>
          Completed: {formatDate(visit?.completedAt)}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Clinical Records</Text>

        <Text style={styles.detail}>
          Procedures recorded: {procedures.length}
        </Text>

        <Text style={styles.detail}>
          Lab results recorded: {labResults.length}
        </Text>

        <Text style={styles.detail}>
          Prescriptions recorded: {prescriptions.length}
        </Text>

        {summary.diagnosis ? (
          <Text style={styles.detail}>
            Diagnosis: {summary.diagnosis}
          </Text>
        ) : null}
      </View>

      <TouchableOpacity
        style={styles.printButton}
        onPress={printForm}
      >
        <Text style={styles.printButtonText}>
          🖨️ Print Medical Form
        </Text>
      </TouchableOpacity>

      <Text style={styles.helperText}>
        On the print screen, choose Save as PDF or select the hospital printer.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
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
    marginBottom: 8,
  },

  subtitle: {
    fontSize: 14,
    color: "#6b7280",
    marginBottom: 16,
  },

  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 8,
    color: "#111827",
  },

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  printButton: {
    backgroundColor: "#7c3aed",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 10,
  },

  printButtonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16,
  },

  helperText: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 20,
  },
});
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

type Patient = {
  _id?: string;
  name?: string;
  phone?: string;
  gender?: string;
  age?: number;
  address?: string;
  tribe?: string;
  nextOfKinName?: string;
  nextOfKinPhone?: string;
};

type BillPayment = {
  amount?: number;
  method?: string;
  reference?: string;
  note?: string;
  collectedByName?: string;
  paidAt?: string;
};

type BillItem = {
  description?: string;
  category?: string;
  quantity?: number;
  unitPrice?: number;
  amount?: number;
  notes?: string;
};

type Bill = {
  _id: string;
  billNumber?: string;
  facilityType?: string;
  status?: string;
  patient?: Patient | null;
  customerName?: string;
  customerPhone?: string;
  visit?: {
    _id?: string;
    visitNumber?: string;
    status?: string;
    currentDepartment?: string;
  } | null;
  items?: BillItem[];
  subtotal?: number;
  discount?: number;
  chargedAmount?: number;
  paidAmount?: number;
  balance?: number;
  payments?: BillPayment[];
  notes?: string;
  voidReason?: string;
  createdAt?: string;
  createdBy?: {
    name?: string;
    role?: string;
  } | null;
};

const ALLOWED_ROLES = [
  "admin",
  "billing",
  "reception",
  "pharmacist",
  "staff",
];

function formatMoney(value?: number | string | null) {
  const num = Number(value || 0);

  if (!Number.isFinite(num)) {
    return "UGX 0";
  }

  return `UGX ${num.toLocaleString()}`;
}

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

function facilityLabel(value?: string) {
  switch (value) {
    case "hospital":
      return "Hospital";
    case "clinic":
      return "Clinic";
    case "drug_shop":
      return "Drug Shop";
    case "walk_in":
      return "Walk-in";
    default:
      return "Health Facility";
  }
}

function statusLabel(value?: string) {
  switch (value) {
    case "paid":
      return "PAID";
    case "partial":
      return "PARTIAL";
    case "open":
      return "UNPAID";
    case "void":
      return "VOID";
    case "refunded":
      return "REFUNDED";
    default:
      return "BILL";
  }
}

function statusColor(value?: string) {
  switch (value) {
    case "paid":
      return "#15803d";
    case "partial":
      return "#b45309";
    case "open":
      return "#2563eb";
    case "void":
      return "#b91c1c";
    case "refunded":
      return "#6b7280";
    default:
      return "#374151";
  }
}

function buildReceiptHtml(bill: Bill) {
  const items = Array.isArray(bill.items) ? bill.items : [];
  const payments = Array.isArray(bill.payments) ? bill.payments : [];

  const customerName =
    bill.patient?.name ||
    bill.customerName ||
    "Walk-in Customer";

  const customerPhone =
    bill.patient?.phone ||
    bill.customerPhone ||
    "—";

  const cashierName =
    bill.createdBy?.name ||
    payments[0]?.collectedByName ||
    "Staff";

  const itemsHtml =
    items.length === 0
      ? `<tr><td colspan="5">No items recorded</td></tr>`
      : items
          .map(
            (item) => `
              <tr>
                <td>${escapeHtml(item.description)}</td>
                <td>${escapeHtml(humanize(item.category))}</td>
                <td class="right">${escapeHtml(item.quantity ?? 1)}</td>
                <td class="right">${escapeHtml(
                  formatMoney(item.unitPrice)
                )}</td>
                <td class="right">${escapeHtml(
                  formatMoney(item.amount)
                )}</td>
              </tr>
            `
          )
          .join("");

  const paymentsHtml =
    payments.length === 0
      ? `<tr><td colspan="5">No payment recorded yet</td></tr>`
      : payments
          .map(
            (payment) => `
              <tr>
                <td>${escapeHtml(formatDate(payment.paidAt))}</td>
                <td>${escapeHtml(humanize(payment.method))}</td>
                <td class="right">${escapeHtml(
                  formatMoney(payment.amount)
                )}</td>
                <td>${escapeHtml(payment.reference || "—")}</td>
                <td>${escapeHtml(
                  payment.collectedByName || cashierName
                )}</td>
              </tr>
            `
          )
          .join("");

  return `
<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Bill Receipt - ${escapeHtml(bill.billNumber || "")}</title>
    <style>
      body {
        font-family: Arial, Helvetica, sans-serif;
        padding: 18px;
        color: #111827;
        background: #ffffff;
      }

      .receipt {
        max-width: 420px;
        margin: 0 auto;
        border: 1px solid #d1d5db;
        padding: 16px;
      }

      .header {
        text-align: center;
        border-bottom: 2px solid #111827;
        padding-bottom: 10px;
        margin-bottom: 12px;
      }

      .facility {
        font-size: 18px;
        font-weight: bold;
        margin: 0;
      }

      .receipt-title {
        font-size: 14px;
        font-weight: bold;
        margin-top: 4px;
      }

      .status {
        display: inline-block;
        margin-top: 8px;
        padding: 4px 10px;
        border-radius: 999px;
        color: #ffffff;
        font-size: 12px;
        font-weight: bold;
      }

      .info {
        font-size: 12px;
        margin-bottom: 10px;
      }

      .info div {
        margin-bottom: 3px;
      }

      .section-title {
        font-size: 13px;
        font-weight: bold;
        margin-top: 12px;
        margin-bottom: 6px;
        border-bottom: 1px solid #e5e7eb;
        padding-bottom: 4px;
      }

      table {
        width: 100%;
        border-collapse: collapse;
        font-size: 11px;
        margin-bottom: 10px;
      }

      th, td {
        border: 1px solid #d1d5db;
        padding: 6px;
        vertical-align: top;
      }

      th {
        background: #f3f4f6;
        text-align: left;
      }

      .right {
        text-align: right;
      }

      .totals td {
        font-weight: bold;
      }

      .note {
        font-size: 11px;
        color: #374151;
        margin-top: 8px;
      }

      .footer {
        margin-top: 16px;
        text-align: center;
        font-size: 10px;
        color: #6b7280;
        border-top: 1px dashed #d1d5db;
        padding-top: 8px;
      }

      .void-watermark {
        margin-top: 10px;
        text-align: center;
        color: #b91c1c;
        font-weight: bold;
        font-size: 16px;
      }

      @media print {
        body {
          padding: 0;
        }

        .receipt {
          border: none;
          max-width: 100%;
        }
      }
    </style>
  </head>

  <body>
    <div class="receipt">
      <div class="header">
        <div class="facility">ST. PHILIPS HEALTH FACILITY</div>
        <div class="receipt-title">Bill Receipt</div>
        <div class="status" style="background:${statusColor(bill.status)}">
          ${escapeHtml(statusLabel(bill.status))}
        </div>
      </div>

      <div class="info">
        <div><strong>Bill No:</strong> ${escapeHtml(bill.billNumber)}</div>
        <div><strong>Date:</strong> ${escapeHtml(formatDate(bill.createdAt))}</div>
        <div><strong>Facility Type:</strong> ${escapeHtml(
          facilityLabel(bill.facilityType)
        )}</div>
        <div><strong>Customer:</strong> ${escapeHtml(customerName)}</div>
        <div><strong>Phone:</strong> ${escapeHtml(customerPhone)}</div>
        ${
          bill.visit?.visitNumber
            ? `<div><strong>Visit:</strong> ${escapeHtml(
                bill.visit.visitNumber
              )}</div>`
            : ""
        }
        <div><strong>Created By:</strong> ${escapeHtml(cashierName)}</div>
      </div>

      <div class="section-title">Items</div>
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th>Category</th>
            <th class="right">Qty</th>
            <th class="right">Unit Price</th>
            <th class="right">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <div class="section-title">Totals</div>
      <table class="totals">
        <tbody>
          <tr>
            <td>Subtotal</td>
            <td class="right">${escapeHtml(formatMoney(bill.subtotal))}</td>
          </tr>
          <tr>
            <td>Discount</td>
            <td class="right">${escapeHtml(formatMoney(bill.discount))}</td>
          </tr>
          <tr>
            <td>Charged Amount</td>
            <td class="right">${escapeHtml(
              formatMoney(bill.chargedAmount)
            )}</td>
          </tr>
          <tr>
            <td>Paid Amount</td>
            <td class="right">${escapeHtml(formatMoney(bill.paidAmount))}</td>
          </tr>
          <tr>
            <td>Balance</td>
            <td class="right">${escapeHtml(formatMoney(bill.balance))}</td>
          </tr>
        </tbody>
      </table>

      <div class="section-title">Payments</div>
      <table>
        <thead>
          <tr>
            <th>Date</th>
            <th>Method</th>
            <th class="right">Amount</th>
            <th>Reference</th>
            <th>Collected By</th>
          </tr>
        </thead>
        <tbody>
          ${paymentsHtml}
        </tbody>
      </table>

      ${
        bill.notes
          ? `<div class="note"><strong>Note:</strong> ${escapeHtml(
              bill.notes
            )}</div>`
          : ""
      }

      ${
        bill.voidReason
          ? `<div class="note"><strong>Void Reason:</strong> ${escapeHtml(
              bill.voidReason
            )}</div>`
          : ""
      }

      ${
        bill.status === "void"
          ? `<div class="void-watermark">THIS BILL IS VOID</div>`
          : ""
      }

      <div class="footer">
        Thank you. Keep this receipt for your records.<br />
        Generated on ${escapeHtml(new Date().toLocaleString())}
      </div>
    </div>
  </body>
</html>
  `;
}

export default function BillReceiptScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, logout } = useContext(AuthContext);

  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const billId = rawId;

  const [bill, setBill] = useState<Bill | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const allowed = ALLOWED_ROLES.includes(user?.role || "");

  const loadBill = useCallback(async () => {
    if (!billId) {
      setError("No bill ID provided.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const res = await API.get(`/bills/${billId}`);
      setBill(res.data?.bill || null);
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to load bill receipt";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
    } finally {
      setLoading(false);
    }
  }, [billId, logout, router]);

  useEffect(() => {
    loadBill();
  }, [loadBill]);

  const printReceipt = () => {
    if (!bill) {
      Alert.alert("Error", "No receipt data available.");
      return;
    }

    if (Platform.OS !== "web") {
      Alert.alert(
        "Printing available on web",
        "Please open this system in a browser to print the bill receipt."
      );
      return;
    }

    const browserWindow = globalThis as any;

    const win = browserWindow.window.open(
      "",
      "_blank",
      "width=520,height=760"
    );

    if (!win) {
      Alert.alert(
        "Popup blocked",
        "Please allow popups for localhost so the bill receipt can print."
      );
      return;
    }

    const html = buildReceiptHtml(bill);

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
        title="Loading bill receipt..."
        subtitle="Please wait while the receipt loads."
      />
    );
  }

  if (!allowed) {
    return (
      <ErrorState
        message="You do not have permission to view this bill receipt."
        onRetry={() => router.back()}
      />
    );
  }

  if (error && !bill) {
    return (
      <ErrorState
        message={error}
        onRetry={() => loadBill()}
      />
    );
  }

  const items = Array.isArray(bill?.items) ? bill.items : [];
  const payments = Array.isArray(bill?.payments) ? bill.payments : [];

  const customerName =
    bill?.patient?.name ||
    bill?.customerName ||
    "Walk-in Customer";

  const customerPhone =
    bill?.patient?.phone ||
    bill?.customerPhone ||
    "—";

  const cashierName =
    bill?.createdBy?.name ||
    payments[0]?.collectedByName ||
    "Staff";

  return (
    <ScrollView style={styles.screen}>
      <TouchableOpacity
        onPress={() => router.back()}
        style={styles.backButton}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>🧾 Bill Receipt</Text>

      <Text style={styles.subtitle}>
        Review the bill and print the customer receipt.
      </Text>

      <ErrorBanner message={error} />

      <View style={styles.card}>
        <View style={styles.billHeader}>
          <Text style={styles.billNumber}>
            {bill?.billNumber || "—"}
          </Text>

          <View
            style={[
              styles.statusPill,
              { backgroundColor: statusColor(bill?.status) },
            ]}
          >
            <Text style={styles.statusPillText}>
              {statusLabel(bill?.status)}
            </Text>
          </View>
        </View>

        <Text style={styles.detail}>
          Date: {formatDate(bill?.createdAt)}
        </Text>

        <Text style={styles.detail}>
          Facility Type: {facilityLabel(bill?.facilityType)}
        </Text>

        <Text style={styles.detail}>
          Customer: {customerName}
        </Text>

        <Text style={styles.detail}>
          Phone: {customerPhone}
        </Text>

        {bill?.visit?.visitNumber ? (
          <Text style={styles.detail}>
            Visit: {bill.visit.visitNumber}
          </Text>
        ) : null}

        <Text style={styles.detail}>
          Created By: {cashierName}
        </Text>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Items</Text>

        {items.length === 0 ? (
          <Text style={styles.helperText}>No items recorded.</Text>
        ) : (
          items.map((item, index) => (
            <View key={`${item.description}-${index}`} style={styles.itemRow}>
              <Text style={styles.itemName}>
                {item.description || "Item"}
              </Text>

              <Text style={styles.detail}>
                Category: {humanize(item.category)}
              </Text>

              <Text style={styles.detail}>
                Qty: {item.quantity ?? 1} × {formatMoney(item.unitPrice)}
              </Text>

              <Text style={styles.itemAmount}>
                Amount: {formatMoney(item.amount)}
              </Text>
            </View>
          ))
        )}
      </View>

      <View style={styles.totalsCard}>
        <Text style={styles.totalsTitle}>Totals</Text>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Subtotal</Text>
          <Text style={styles.totalValue}>
            {formatMoney(bill?.subtotal)}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Discount</Text>
          <Text style={styles.totalValue}>
            {formatMoney(bill?.discount)}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Charged</Text>
          <Text style={[styles.totalValue, styles.bold]}>
            {formatMoney(bill?.chargedAmount)}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Paid</Text>
          <Text style={[styles.totalValue, { color: "#4ade80" }]}>
            {formatMoney(bill?.paidAmount)}
          </Text>
        </View>

        <View style={styles.totalRow}>
          <Text style={styles.totalLabel}>Balance</Text>
          <Text
            style={[
              styles.totalValue,
              styles.bold,
              {
                color:
                  Number(bill?.balance || 0) > 0 ? "#fca5a5" : "#4ade80",
              },
            ]}
          >
            {formatMoney(bill?.balance)}
          </Text>
        </View>
      </View>

      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Payments</Text>

        {payments.length === 0 ? (
          <Text style={styles.helperText}>No payment recorded yet.</Text>
        ) : (
          payments.map((payment, index) => (
            <View
              key={`${payment.paidAt}-${index}`}
              style={styles.paymentRow}
            >
              <Text style={styles.paymentAmount}>
                {formatMoney(payment.amount)}
              </Text>

              <Text style={styles.detail}>
                Method: {humanize(payment.method)}
              </Text>

              {payment.reference ? (
                <Text style={styles.detail}>
                  Reference: {payment.reference}
                </Text>
              ) : null}

              {payment.collectedByName ? (
                <Text style={styles.detail}>
                  Collected by: {payment.collectedByName}
                </Text>
              ) : null}

              <Text style={styles.detail}>
                Date: {formatDate(payment.paidAt)}
              </Text>
            </View>
          ))
        )}
      </View>

      {bill?.notes ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>Note</Text>
          <Text style={styles.detail}>{bill.notes}</Text>
        </View>
      ) : null}

      {bill?.voidReason ? (
        <View style={styles.voidCard}>
          <Text style={styles.voidTitle}>Void Reason</Text>
          <Text style={styles.voidText}>{bill.voidReason}</Text>
        </View>
      ) : null}

      <TouchableOpacity
        style={styles.printButton}
        onPress={printReceipt}
      >
        <Text style={styles.printButtonText}>
          🖨️ Print Bill Receipt
        </Text>
      </TouchableOpacity>

      <Text style={styles.helperText}>
        On the print screen, choose Print or Save as PDF.
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

  voidCard: {
    backgroundColor: "#fef2f2",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#fecaca",
    marginBottom: 12,
  },

  voidTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#b91c1c",
    marginBottom: 6,
  },

  voidText: {
    fontSize: 14,
    color: "#7f1d1d",
  },

  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  billNumber: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },

  statusPill: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
  },

  statusPillText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 12,
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#111827",
  },

  detail: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 4,
  },

  helperText: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
  },

  itemRow: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 10,
  },

  itemName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },

  itemAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 4,
  },

  totalsCard: {
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  totalsTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 10,
  },

  totalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },

  totalLabel: {
    color: "#d1d5db",
    fontSize: 14,
  },

  totalValue: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "600",
  },

  bold: {
    fontWeight: "bold",
  },

  paymentRow: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginBottom: 10,
  },

  paymentAmount: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#15803d",
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
});
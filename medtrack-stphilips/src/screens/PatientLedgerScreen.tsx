import React, { useCallback, useContext, useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";

import { useRouter } from "expo-router";

import API from "../services/api";
import { AuthContext } from "../context/AuthContext";

import {
  ErrorState,
  ErrorBanner,
  EmptyState,
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
  items?: any[];
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

type LedgerSummary = {
  totalCharged?: number;
  totalPaid?: number;
  totalBalance?: number;
  bills?: number;
};

type WalkInCustomer = {
  name: string;
  phone: string;
  billsCount: number;
  totalCharged: number;
  totalPaid: number;
  balance: number;
  lastBillAt?: string;
};

type SelectedTarget =
  | { type: "patient"; patient: Patient }
  | { type: "walk_in"; customer: WalkInCustomer };

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

function getStatusColor(status?: string) {
  switch (status) {
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

function getItemPreview(bill: Bill) {
  const items = Array.isArray(bill.items) ? bill.items : [];

  if (items.length === 0) {
    return "No items";
  }

  const preview = items
    .slice(0, 2)
    .map((item: any) => {
      const description = item.description || "Item";
      const quantity = item.quantity ?? 1;
      const unitPrice = Number(item.unitPrice || 0);

      return `${description} (${quantity} × ${formatMoney(unitPrice)})`;
    })
    .join(", ");

  if (items.length > 2) {
    return `${preview} + ${items.length - 2} more`;
  }

  return preview;
}

function getLatestPayment(bill: Bill) {
  const payments = Array.isArray(bill.payments) ? bill.payments : [];

  if (payments.length === 0) {
    return null;
  }

  return payments[payments.length - 1];
}

function computeWalkInSummary(bills: Bill[]): LedgerSummary {
  let totalCharged = 0;
  let totalPaid = 0;
  let totalBalance = 0;

  for (const bill of bills) {
    totalCharged += Number(bill.chargedAmount || 0);
    totalPaid += Number(bill.paidAmount || 0);
    totalBalance += Number(bill.balance || 0);
  }

  return {
    totalCharged,
    totalPaid,
    totalBalance,
    bills: bills.length,
  };
}

export default function PatientLedgerScreen() {
  const router = useRouter();
  const { user, logout } = useContext(AuthContext);

  const allowed = ALLOWED_ROLES.includes(user?.role || "");

  const [search, setSearch] = useState("");
  const [searching, setSearching] = useState(false);

  const [patientResults, setPatientResults] = useState<Patient[]>([]);
  const [walkInResults, setWalkInResults] = useState<WalkInCustomer[]>([]);

  const [selected, setSelected] = useState<SelectedTarget | null>(null);

  const [bills, setBills] = useState<Bill[]>([]);
  const [summary, setSummary] = useState<LedgerSummary>({});

  const [loadingLedger, setLoadingLedger] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPatientLedger = useCallback(
    async (patientId: string, isRefresh = false) => {
      if (!patientId) {
        return;
      }

      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoadingLedger(true);
      }

      setError(null);

      try {
        const res = await API.get(`/bills/patient/${patientId}`);

        setBills(Array.isArray(res.data?.bills) ? res.data.bills : []);
        setSummary(res.data?.summary || {});
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load patient ledger";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        setError(message);
        setBills([]);
        setSummary({});
      } finally {
        setLoadingLedger(false);
        setRefreshing(false);
      }
    },
    [logout, router]
  );

  const loadWalkInLedger = useCallback(
    async (customer: WalkInCustomer, isRefresh = false) => {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoadingLedger(true);
      }

      setError(null);

      try {
        const term = customer.phone || customer.name;

        const res = await API.get("/bills", {
          params: {
            range: "all",
            q: term,
            limit: 500,
          },
        });

        const allBills = Array.isArray(res.data?.bills)
          ? res.data.bills
          : [];

        const matched = allBills.filter((bill: Bill) => {
          if (bill.patient?._id) {
            return false;
          }

          if (bill.status === "void") {
            return false;
          }

          if (customer.phone) {
            return bill.customerPhone === customer.phone;
          }

          return bill.customerName === customer.name;
        });

        setBills(matched);
        setSummary(computeWalkInSummary(matched));
      } catch (err: any) {
        const status = err?.response?.status;
        const message =
          err?.response?.data?.error ||
          err?.response?.data?.message ||
          err?.message ||
          "Failed to load walk-in customer ledger";

        if (status === 401) {
          await logout();
          router.replace("/");
          return;
        }

        setError(message);
        setBills([]);
        setSummary({});
      } finally {
        setLoadingLedger(false);
        setRefreshing(false);
      }
    },
    [logout, router]
  );

  const searchPatientsAndCustomers = async () => {
    const term = search.trim();

    if (!term) {
      setError("Enter a patient name, phone, or walk-in customer name.");
      return;
    }

    try {
      setSearching(true);
      setError(null);
      setPatientResults([]);
      setWalkInResults([]);

      const [patientsRes, billsRes] = await Promise.all([
        API.get("/patients/search", {
          params: {
            name: term,
          },
        }),
        API.get("/bills", {
          params: {
            range: "all",
            q: term,
            limit: 500,
          },
        }),
      ]);

      const patientRows = Array.isArray(patientsRes.data?.results)
        ? patientsRes.data.results
        : [];

      const patients = patientRows
        .map((row: any) => row?.patient)
        .filter(Boolean);

      setPatientResults(patients);

      const allBills = Array.isArray(billsRes.data?.bills)
        ? billsRes.data.bills
        : [];

      const walkInMap = new Map<
        string,
        WalkInCustomer & { lastTime: number }
      >();

      for (const bill of allBills) {
        if (bill.patient?._id) {
          continue;
        }

        if (bill.status === "void") {
          continue;
        }

        const name = bill.customerName || "Walk-in Customer";
        const phone = bill.customerPhone || "";

        const key = phone ? `phone:${phone}` : `name:${name}`;
        const time = new Date(bill.createdAt || 0).getTime();

        const charged = Number(bill.chargedAmount || 0);
        const paid = Number(bill.paidAmount || 0);
        const balance = Number(bill.balance || 0);

        const existing = walkInMap.get(key);

        if (existing) {
          existing.totalCharged += charged;
          existing.totalPaid += paid;
          existing.balance += balance;
          existing.billsCount += 1;

          if (time > existing.lastTime) {
            existing.lastBillAt = bill.createdAt;
            existing.lastTime = time;
          }
        } else {
          walkInMap.set(key, {
            name,
            phone,
            billsCount: 1,
            totalCharged: charged,
            totalPaid: paid,
            balance,
            lastBillAt: bill.createdAt,
            lastTime: time,
          });
        }
      }

      const walkIns = Array.from(walkInMap.values())
        .sort((a, b) => b.lastTime - a.lastTime)
        .map(({ lastTime, ...rest }) => rest);

      setWalkInResults(walkIns);

      if (patients.length === 0 && walkIns.length === 0) {
        setError("No matching patient or walk-in customer found.");
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const message =
        err?.response?.data?.error ||
        err?.response?.data?.message ||
        err?.message ||
        "Failed to search ledger records";

      if (status === 401) {
        await logout();
        router.replace("/");
        return;
      }

      setError(message);
      setPatientResults([]);
      setWalkInResults([]);
    } finally {
      setSearching(false);
    }
  };

  const selectPatient = async (patient: Patient) => {
    if (!patient._id) {
      return;
    }

    setSelected({ type: "patient", patient });
    setPatientResults([]);
    setWalkInResults([]);
    setSearch("");
    setBills([]);
    setSummary({});

    await loadPatientLedger(patient._id, false);
  };

  const selectWalkIn = async (customer: WalkInCustomer) => {
    setSelected({ type: "walk_in", customer });
    setPatientResults([]);
    setWalkInResults([]);
    setSearch("");
    setBills([]);
    setSummary({});

    await loadWalkInLedger(customer, false);
  };

  const clearSelected = () => {
    setSelected(null);
    setBills([]);
    setSummary({});
    setError(null);
    setSearch("");
    setPatientResults([]);
    setWalkInResults([]);
  };

  if (!allowed) {
    return (
      <ErrorState
        message="You do not have permission to access the patient ledger."
        onRetry={() => router.replace("/worklist")}
      />
    );
  }

  const displayPatientName =
    selected?.type === "patient"
      ? selected.patient.name || "Patient"
      : selected?.type === "walk_in"
      ? selected.customer.name || "Walk-in Customer"
      : "Patient";

  const displayPatientPhone =
    selected?.type === "patient"
      ? selected.patient.phone || "—"
      : selected?.type === "walk_in"
      ? selected.customer.phone || "—"
      : "—";

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={() => {
            if (selected?.type === "patient" && selected.patient._id) {
              loadPatientLedger(selected.patient._id, true);
            } else if (selected?.type === "walk_in") {
              loadWalkInLedger(selected.customer, true);
            }
          }}
        />
      }
    >
      <Text style={styles.title}>📒 Patient Ledger</Text>

      <Text style={styles.subtitle}>
        View all bills, payments, and outstanding balances for registered
        patients and walk-in customers.
      </Text>

      <Text style={styles.metaText}>
        Logged in as: {user?.name || "User"} | Role:{" "}
        {user?.role || "unknown"}
      </Text>

      <ErrorBanner message={error} />

      {!selected ? (
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>
            Search Patient / Walk-in Customer
          </Text>

          <Text style={styles.label}>Name or Phone</Text>

          <View style={styles.searchRow}>
            <TextInput
              style={[styles.input, styles.searchInput]}
              value={search}
              onChangeText={setSearch}
              placeholder="e.g. Grace, 0788005001, or walk-in name"
              autoCapitalize="none"
              editable={!searching}
            />

            <TouchableOpacity
              style={styles.searchButton}
              onPress={searchPatientsAndCustomers}
              disabled={searching}
            >
              {searching ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.searchButtonText}>Search</Text>
              )}
            </TouchableOpacity>
          </View>

          {searching ? (
            <Text style={styles.helperText}>Searching...</Text>
          ) : null}

          {patientResults.length > 0 ? (
            <View style={styles.resultsContainer}>
              <Text style={styles.sectionTitle}>Registered Patients</Text>

              {patientResults.map((patient) => (
                <TouchableOpacity
                  key={patient._id}
                  style={styles.resultCard}
                  onPress={() => selectPatient(patient)}
                >
                  <Text style={styles.resultName}>
                    {patient.name || "Unknown Patient"}
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
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {walkInResults.length > 0 ? (
            <View style={styles.resultsContainer}>
              <Text style={styles.sectionTitle}>Walk-in Customers</Text>

              {walkInResults.map((customer) => (
                <TouchableOpacity
                  key={`${customer.phone || customer.name}`}
                  style={styles.walkInCard}
                  onPress={() => selectWalkIn(customer)}
                >
                  <Text style={styles.resultName}>
                    {customer.name || "Walk-in Customer"}
                  </Text>

                  <Text style={styles.detail}>
                    Phone: {customer.phone || "—"}
                  </Text>

                  <Text style={styles.detail}>
                    Bills: {customer.billsCount}
                  </Text>

                  <Text style={styles.detail}>
                    Outstanding: {formatMoney(customer.balance)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          {!searching &&
          patientResults.length === 0 &&
          walkInResults.length === 0 &&
          !error ? (
            <Text style={styles.helperText}>
              Search by patient name, phone number, or walk-in customer name
              to view their billing ledger.
            </Text>
          ) : null}
        </View>
      ) : (
        <>
          <View style={styles.patientCard}>
            <View style={styles.patientHeader}>
              <Text style={styles.patientName}>{displayPatientName}</Text>

              <TouchableOpacity
                style={styles.changeButton}
                onPress={clearSelected}
              >
                <Text style={styles.changeButtonText}>Change</Text>
              </TouchableOpacity>
            </View>

            <Text style={styles.detail}>
              Phone: {displayPatientPhone}
            </Text>

            {selected.type === "patient" ? (
              <>
                <Text style={styles.detail}>
                  Age: {selected.patient.age ?? "—"}
                </Text>

                <Text style={styles.detail}>
                  Gender: {selected.patient.gender || "—"}
                </Text>

                <Text style={styles.detail}>
                  Tribe: {selected.patient.tribe || "—"}
                </Text>

                <Text style={styles.detail}>
                  Next of Kin: {selected.patient.nextOfKinName || "—"} (
                  {selected.patient.nextOfKinPhone || "No phone"})
                </Text>
              </>
            ) : (
              <Text style={styles.detail}>
                Type: Walk-in customer from billing counter
              </Text>
            )}
          </View>

          <View style={styles.summaryCard}>
            <Text style={styles.summaryTitle}>Billing Summary</Text>

            <View style={styles.summaryGrid}>
              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Total Charged</Text>
                <Text style={styles.summaryValue}>
                  {formatMoney(summary.totalCharged)}
                </Text>
              </View>

              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Total Paid</Text>
                <Text style={[styles.summaryValue, { color: "#15803d" }]}>
                  {formatMoney(summary.totalPaid)}
                </Text>
              </View>

              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Outstanding</Text>
                <Text
                  style={[
                    styles.summaryValue,
                    {
                      color:
                        Number(summary.totalBalance || 0) > 0
                          ? "#b91c1c"
                          : "#15803d",
                    },
                  ]}
                >
                  {formatMoney(summary.totalBalance)}
                </Text>
              </View>

              <View style={styles.summaryBox}>
                <Text style={styles.summaryLabel}>Bills</Text>
                <Text style={styles.summaryValue}>
                  {summary.bills ?? 0}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.card}>
            <Text style={styles.sectionTitle}>Bills</Text>

            {loadingLedger ? (
              <View style={styles.loadingRow}>
                <ActivityIndicator />
                <Text style={styles.helperText}>Loading ledger...</Text>
              </View>
            ) : bills.length === 0 ? (
              <EmptyState
                title="No bills found for this patient/customer."
                subtitle="Create a bill from the Billing Counter first."
              />
            ) : (
              bills.map((bill) => {
                const latestPayment = getLatestPayment(bill);
                const balance = Number(bill.balance || 0);

                return (
                  <View key={bill._id} style={styles.billCard}>
                    <View style={styles.billHeader}>
                      <Text style={styles.billNumber}>
                        {bill.billNumber || "—"}
                      </Text>

                      <View
                        style={[
                          styles.statusPill,
                          { backgroundColor: getStatusColor(bill.status) },
                        ]}
                      >
                        <Text style={styles.statusPillText}>
                          {humanize(bill.status)}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.detail}>
                      Date: {formatDate(bill.createdAt)}
                    </Text>

                    <Text style={styles.detail}>
                      Facility: {humanize(bill.facilityType)}
                    </Text>

                    {bill.visit?.visitNumber ? (
                      <Text style={styles.detail}>
                        Visit: {bill.visit.visitNumber}
                      </Text>
                    ) : null}

                    <Text style={styles.itemPreview}>
                      Items: {getItemPreview(bill)}
                    </Text>

                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Charged</Text>
                      <Text style={styles.amountValue}>
                        {formatMoney(bill.chargedAmount)}
                      </Text>
                    </View>

                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Paid</Text>
                      <Text
                        style={[styles.amountValue, { color: "#15803d" }]}
                      >
                        {formatMoney(bill.paidAmount)}
                      </Text>
                    </View>

                    <View style={styles.amountRow}>
                      <Text style={styles.amountLabel}>Balance</Text>
                      <Text
                        style={[
                          styles.amountValue,
                          { color: balance > 0 ? "#b91c1c" : "#15803d" },
                        ]}
                      >
                        {formatMoney(bill.balance)}
                      </Text>
                    </View>

                    {latestPayment ? (
                      <View style={styles.paymentSummary}>
                        <Text style={styles.paymentSummaryTitle}>
                          Latest Payment
                        </Text>

                        <Text style={styles.detail}>
                          Amount: {formatMoney(latestPayment.amount)}
                        </Text>

                        <Text style={styles.detail}>
                          Method: {humanize(latestPayment.method)}
                        </Text>

                        {latestPayment.reference ? (
                          <Text style={styles.detail}>
                            Reference: {latestPayment.reference}
                          </Text>
                        ) : null}

                        {latestPayment.collectedByName ? (
                          <Text style={styles.detail}>
                            Collected by: {latestPayment.collectedByName}
                          </Text>
                        ) : null}

                        <Text style={styles.detail}>
                          Date: {formatDate(latestPayment.paidAt)}
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.noPaymentText}>
                        No payment recorded yet.
                      </Text>
                    )}

                    {bill.voidReason ? (
                      <Text style={styles.voidText}>
                        Void reason: {bill.voidReason}
                      </Text>
                    ) : null}

                    {bill.notes ? (
                      <Text style={styles.noteText}>
                        Note: {bill.notes}
                      </Text>
                    ) : null}
                  </View>
                );
              })
            )}
          </View>
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    padding: 20,
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

  card: {
    backgroundColor: "#ffffff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },

  patientCard: {
    backgroundColor: "#eff6ff",
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#bfdbfe",
    marginBottom: 12,
  },

  summaryCard: {
    backgroundColor: "#111827",
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  summaryTitle: {
    color: "#ffffff",
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 12,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },

  summaryBox: {
    backgroundColor: "#1f2937",
    padding: 12,
    borderRadius: 10,
    minWidth: 140,
    flexGrow: 1,
  },

  summaryLabel: {
    color: "#d1d5db",
    fontSize: 13,
    marginBottom: 6,
  },

  summaryValue: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "bold",
  },

  sectionTitle: {
    fontSize: 17,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#111827",
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

  searchRow: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
    marginBottom: 12,
  },

  searchInput: {
    flex: 1,
    marginBottom: 0,
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

  resultsContainer: {
    marginTop: 8,
  },

  resultCard: {
    backgroundColor: "#f9fafb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 8,
  },

  walkInCard: {
    backgroundColor: "#fffbeb",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#fde68a",
    marginBottom: 8,
  },

  resultName: {
    fontSize: 15,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },

  patientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  patientName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },

  changeButton: {
    backgroundColor: "#fee2e2",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
  },

  changeButtonText: {
    color: "#b91c1c",
    fontWeight: "bold",
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

  loadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },

  billCard: {
    backgroundColor: "#f9fafb",
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    marginBottom: 12,
  },

  billHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },

  billNumber: {
    fontSize: 16,
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

  itemPreview: {
    fontSize: 14,
    color: "#374151",
    marginBottom: 10,
    fontStyle: "italic",
  },

  amountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },

  amountLabel: {
    fontSize: 14,
    color: "#6b7280",
    fontWeight: "600",
  },

  amountValue: {
    fontSize: 14,
    color: "#111827",
    fontWeight: "bold",
  },

  paymentSummary: {
    backgroundColor: "#f0fdf4",
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#bbf7d0",
    marginTop: 10,
  },

  paymentSummaryTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#15803d",
    marginBottom: 6,
  },

  noPaymentText: {
    marginTop: 10,
    fontSize: 13,
    color: "#b91c1c",
    fontWeight: "600",
  },

  voidText: {
    marginTop: 10,
    fontSize: 13,
    color: "#b91c1c",
    fontWeight: "600",
  },

  noteText: {
    marginTop: 8,
    fontSize: 13,
    color: "#6b7280",
    fontStyle: "italic",
  },
});
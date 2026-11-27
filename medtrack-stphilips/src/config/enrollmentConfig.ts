export type EnrollmentType = "insurance" | "program" | "membership" | "donor";
export type EnrollmentStatus = "active" | "expired" | "cancelled" | "suspended";

export const TYPE_META: Record<
  EnrollmentType,
  {
    label: string;
    icon: string;
    color: string;
    deep: string;
    soft: string;
    ink: string;
    blurb: string;
    presets: string[];
    hasFee: boolean;
    hasCategory: boolean;
    hasDonor: boolean;
    hasClinical: boolean;
  }
> = {
  insurance: {
    label: "Health Insurance",
    icon: "🛡️",
    color: "#6366f1",
    deep: "#4338ca",
    soft: "#eef2ff",
    ink: "#3730a3",
    blurb: "Facility or external cover scheme",
    presets: ["MedTrack Care Plan", "Community Health Cover", "Family Shield", "Staff Medical Scheme"],
    hasFee: true, hasCategory: false, hasDonor: false, hasClinical: false,
  },
  program: {
    label: "Health Program",
    icon: "🩺",
    color: "#0d9488",
    deep: "#0f766e",
    soft: "#f0fdfa",
    ink: "#115e59",
    blurb: "Chronic & continuing care",
    presets: ["HIV Care Program", "Diabetes Clinic", "Hypertension Follow-up", "Antenatal Care", "TB Treatment", "Sickle Cell Clinic"],
    hasFee: false, hasCategory: true, hasDonor: false, hasClinical: true,
  },
  membership: {
    label: "Membership",
    icon: "⭐",
    color: "#d97706",
    deep: "#b45309",
    soft: "#fffbeb",
    ink: "#92400e",
    blurb: "Paid subscription plan",
    presets: ["Individual Plan", "Family Plan", "Senior Citizen Plan", "Student Plan"],
    hasFee: true, hasCategory: false, hasDonor: false, hasClinical: false,
  },
  donor: {
    label: "Donor Program",
    icon: "🤝",
    color: "#db2777",
    deep: "#be123c",
    soft: "#fdf2f8",
    ink: "#9d174d",
    blurb: "Funded health initiative",
    presets: ["Malaria Grant", "Maternal Health Fund", "Child Nutrition Fund", "TB Support Grant"],
    hasFee: false, hasCategory: true, hasDonor: true, hasClinical: false,
  },
};

export const STATUS_META: Record<EnrollmentStatus, { label: string; color: string; soft: string }> = {
  active: { label: "Active", color: "#16a34a", soft: "#dcfce7" },
  expired: { label: "Expired", color: "#dc2626", soft: "#fee2e2" },
  cancelled: { label: "Cancelled", color: "#64748b", soft: "#e2e8f0" },
  suspended: { label: "Suspended", color: "#d97706", soft: "#fef3c7" },
};

export const CATEGORIES: { key: string; label: string }[] = [
  { key: "hiv_aids", label: "HIV / AIDS" },
  { key: "diabetes", label: "Diabetes" },
  { key: "hypertension", label: "Hypertension" },
  { key: "maternal_care", label: "Maternal Care" },
  { key: "antenatal", label: "Antenatal" },
  { key: "malaria", label: "Malaria" },
  { key: "tb", label: "Tuberculosis" },
  { key: "family_planning", label: "Family Planning" },
  { key: "nutrition", label: "Nutrition" },
  { key: "mental_health", label: "Mental Health" },
  { key: "sickle_cell", label: "Sickle Cell" },
  { key: "asthma", label: "Asthma" },
  { key: "other", label: "Other" },
];

export const METHODS = [
  { key: "cash", label: "Cash", icon: "💵" },
  { key: "mobile_money", label: "Mobile Money", icon: "📱" },
  { key: "bank_transfer", label: "Bank", icon: "🏦" },
  { key: "insurance", label: "Insurance", icon: "🛡️" },
  { key: "other", label: "Other", icon: "•" },
];

export const MONTH = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

export function ugx(v: number | undefined | null): string {
  const n = Math.round(Number(v || 0));
  const s = String(Math.abs(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${n < 0 ? "-" : ""}UGX ${s}`;
}

export function shortDate(v: any): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  return `${d.getDate()} ${MONTH[d.getMonth()]} ${d.getFullYear()}`;
}

export function longDateTime(v: any): string {
  if (!v) return "—";
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "—";
  const h = d.getHours();
  const m = String(d.getMinutes()).padStart(2, "0");
  const ap = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${shortDate(d)} · ${hh}:${m} ${ap}`;
}

export function daysUntil(v: any): number {
  if (!v) return 0;
  const d = new Date(v).getTime();
  if (Number.isNaN(d)) return 0;
  return Math.ceil((d - Date.now()) / 86400000);
}

export function expiryTone(v: any): { color: string; soft: string; text: string } {
  const d = daysUntil(v);
  if (d < 0) return { color: "#dc2626", soft: "#fee2e2", text: `Expired ${Math.abs(d)}d ago` };
  if (d === 0) return { color: "#dc2626", soft: "#fee2e2", text: "Expires today" };
  if (d <= 14) return { color: "#d97706", soft: "#fef3c7", text: `${d}d left` };
  if (d <= 30) return { color: "#ca8a04", soft: "#fefce8", text: `${d}d left` };
  return { color: "#16a34a", soft: "#dcfce7", text: `${d}d left` };
}

export function addMonths(months: number): string {
  const d = new Date();
  d.setMonth(d.getMonth() + months);
  return d.toISOString().slice(0, 10);
}

export function categoryLabel(key?: string): string {
  return CATEGORIES.find((c) => c.key === key)?.label || "—";
}

export function methodLabel(key?: string): string {
  return METHODS.find((m) => m.key === key)?.label || "Cash";
}
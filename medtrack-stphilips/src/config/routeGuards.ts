export type AppRole =
  | "admin"
  | "reception"
  | "doctor"
  | "lab"
  | "billing"
  | "pharmacist"
  | "staff";

export const ROUTE_ROLES: Record<string, AppRole[]> = {
  "/dashboard": ["admin", "reception"],

  "/admin-overview": ["admin"],

  "/admin-users": ["admin"],

  "/patients": ["admin", "reception", "doctor"],

  "/patient-history": ["admin", "reception", "doctor"],

  "/edit-patient": [ "admin", "reception","doctor", "lab", "pharmacist",],
  "/medical-form": [ "admin","reception", "doctor", "lab", "pharmacist", "staff",],
  "/prescription-editor": ["admin", "doctor"],

  "/queue": ["admin", "reception"],
  
  "/receipt": ["admin", "billing"],

  "/worklist": [
    "admin",
    "doctor",
    "lab",
    "billing",
    "pharmacist",
    "staff",
  ],

  "/consultation": ["admin", "doctor"],

  "/laboratory": ["admin", "lab"],
  "/procedure": ["admin", "doctor", "staff"],

  "/interpretation": ["admin", "doctor"],

  "/billing": ["admin", "billing"],
  "/billing-counter": [
  
  "admin",
  "billing",
  "reception",
  "pharmacist",
  "staff",
],

"/patient-ledger": [
  "admin",
  "billing",
  "reception",
  "pharmacist",
  "staff",
],

  "/payments": ["admin", "billing"],

  "/attendance": [
    "admin",
    "reception",
    "doctor",
    "lab",
    "billing",
    "pharmacist",
    "staff",
  ],

  "/add-patient": ["admin", "reception"],

  "/inventory": ["admin", "pharmacist"],

  "/dispense": ["admin", "pharmacist"],

  "/alerts": ["admin"],

  "/history": ["admin"],

  "/anomalies": ["admin"],
};

export function getHomeRouteForRole(role?: string): string {
  switch (role) {
    case "admin":
    case "reception":
      return "/dashboard";

    case "doctor":
    case "lab":
    case "billing":
    case "pharmacist":
    case "staff":
      return "/worklist";

    default:
      return "/worklist";
  }
}

export function canAccessRoute(role?: string, route?: string): boolean {
  if (!role || !route) {
    return false;
  }

  if (route === getHomeRouteForRole(role)) {
    return true;
  }

  const allowedRoles = ROUTE_ROLES[route];

  if (!allowedRoles) {
    return false;
  }

  return allowedRoles.includes(role as AppRole);
}
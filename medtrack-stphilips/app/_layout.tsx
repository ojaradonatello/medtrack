import React, { useContext, useEffect } from "react";

import { Drawer } from "expo-router/drawer";
import { useRouter, usePathname, useNavigation } from "expo-router";

import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";

import { GestureHandlerRootView } from "react-native-gesture-handler";

import {
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";

import {
  AuthProvider,
  AuthContext,
} from "../src/context/AuthContext";

import {
  canAccessRoute,
  getHomeRouteForRole,
  isPublicRoute,
} from "../src/config/routeGuards";

const queryClient = new QueryClient();

type MenuItem = {
  label: string;
  route: string;
  icon: string;
};

type MenuSection = {
  title: string;
  items: MenuItem[];
};

const MODULE_ROUTE_MAP: Record<string, string> = {
  "/consultation": "consultation",
  "/laboratory": "laboratory",
  "/procedure": "procedure",
  "/interpretation": "interpretation",
  "/prescription-editor": "prescription",
  "/billing": "billing",
  "/billing-counter": "billing_counter",
  "/patient-ledger": "patient_ledger",
  "/daily-cashier": "daily_cashier",
  "/payments": "billing",
  "/receipt": "billing",
  "/dispense": "pharmacy",
  "/inventory": "pharmacy",
  "/medical-form": "medical_form",
  "/attendance": "attendance",
  "/admin-overview": "admin_overview",
  "/admin-users": "admin_overview",
  "/alerts": "admin_overview",
  "/history": "admin_overview",
  "/anomalies": "admin_overview",
    "/patients": "consultation",
  "/patient-history": "consultation",
  "/edit-patient": "consultation",
  "/queue": "consultation",
  "/add-patient": "consultation",
  "/worklist": "consultation",
  "/bill-receipt": "billing_counter",
  "/facility-setup": "admin_overview",
    "/enrollments": "enrollment",
  "/enroll-patient": "enrollment",
  "/enrollment-detail": "enrollment",
};

const MENU_SECTIONS: MenuSection[] = [


    {
    title: "Platform",
    items: [
      {
        label: "Platform Console",
        route: "/platform-admin",
        icon: "🛰️",
      },
    ],
  },

  {

    
    title: "Front Desk",
    items: [
      {
        label: "Dashboard",
        route: "/dashboard",
        icon: "🏠",
      },
      {
        label: "Patient Queue",
        route: "/queue",
        icon: "🕒",
      },
      {
        label: "Add Patient",
        route: "/add-patient",
        icon: "👤",
      },
      {
        label: "Patients",
        route: "/patients",
        icon: "👥",
      },
    ],
  },

  {
    title: "Clinical Workflow",
    items: [
      {
        label: "Consultation",
        route: "/consultation",
        icon: "👨‍⚕️",
      },
      {
        label: "Procedure Room",
        route: "/procedure",
        icon: "🩹",
      },
      {
        label: "Laboratory",
        route: "/laboratory",
        icon: "🧫",
      },
      {
        label: "Interpretation",
        route: "/interpretation",
        icon: "🧪",
      },
      {
        label: "Worklist",
        route: "/worklist",
        icon: "🩺",
      },
    ],
  },

    {
    title: "Enrollment",
    items: [
      {
        label: "Enrollment Register",
        route: "/enrollments",
        icon: "🗂️",
      },
      {
        label: "Enroll Patient",
        route: "/enroll-patient",
        icon: "🪪",
      },
    ],
  },


  {
    title: "Finance",
    items: [
      {
        label: "Billing Counter",
        route: "/billing-counter",
        icon: "🧾",
      },
      {
        label: "Patient Ledger",
        route: "/patient-ledger",
        icon: "📒",
      },
      {
        label: "Daily Cashier",
        route: "/daily-cashier",
        icon: "📊",
      },
      {
        label: "Billing",
        route: "/billing",
        icon: "💳",
      },
      {
        label: "Payments",
        route: "/payments",
        icon: "💰",
      },
    ],
  },

  {
    title: "Staff",
    items: [
      {
        label: "Attendance",
        route: "/attendance",
        icon: "🗓️",
      },
    ],
  },

  {
    title: "Pharmacy",
    items: [
      {
        label: "Inventory",
        route: "/inventory",
        icon: "📦",
      },
      {
        label: "Dispense",
        route: "/dispense",
        icon: "💊",
      },
    ],
  },

  {
    title: "Administration",
    items: [
      {
        label: "Admin Overview",
        route: "/admin-overview",
        icon: "🛡️",
      },
      {
        label: "User Management",
        route: "/admin-users",
        icon: "🧑‍💼",
      },
      {
        label: "Alerts",
        route: "/alerts",
        icon: "🚨",
      },
      {
        label: "AI Alerts",
        route: "/anomalies",
        icon: "🧠",
      },
      {
        label: "History",
        route: "/history",
        icon: "📜",
      },
    ],
  },
];

const styles = StyleSheet.create({
  guardCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },

  guardText: {
    marginTop: 10,
    color: "#6b7280",
  },

  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#fff",
  },

  header: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#111827",
  },

  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },

  facilityBadge: {
    fontSize: 12,
    color: "#2563eb",
    fontWeight: "600",
    marginTop: 4,
  },

  userName: {
    marginTop: 12,
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },

  userRole: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },

  sectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#6b7280",
    marginTop: 16,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 8,
    marginBottom: 6,
  },

  menuText: {
    fontSize: 16,
    color: "#333",
  },

  activeItem: {
    backgroundColor: "#e6f0ff",
  },

  activeText: {
    color: "#1e6fff",
    fontWeight: "600",
  },

  noAccessBox: {
    backgroundColor: "#f3f4f6",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },

  noAccessText: {
    color: "#6b7280",
  },

  footer: {
    marginTop: "auto",
    paddingTop: 16,
  },

  logoutBtn: {
    backgroundColor: "#e53935",
    padding: 12,
    borderRadius: 8,
  },

  logoutText: {
    color: "#fff",
    textAlign: "center",
    fontWeight: "600",
  },

  hamburger: {
    paddingHorizontal: 16,
    paddingVertical: 10,
  },

  hamburgerText: {
    fontSize: 22,
    color: "#111827",
  },
});

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading, hasModule } = useContext(AuthContext);
  const router = useRouter();
  const pathname = usePathname();

  const role = user?.role;
  const publicRoute = isPublicRoute(pathname);
  const homeRoute = getHomeRouteForRole(role);

  const roleAllowed = role ? canAccessRoute(role, pathname) : false;
  const moduleKey = MODULE_ROUTE_MAP[pathname];
  const moduleAllowed = moduleKey ? hasModule(moduleKey) : true;

  const allowed = publicRoute ? true : roleAllowed && moduleAllowed;

  useEffect(() => {
    if (loading) return;

    if (!user || !role) {
      if (!publicRoute) {
        router.replace("/");
      }
      return;
    }

    if (publicRoute) {
      router.replace(homeRoute);
      return;
    }

    if (!allowed) {
      router.replace(homeRoute);
    }
  }, [user, role, loading, publicRoute, homeRoute, allowed, pathname, router]);

  if (loading) {
    return (
      <View style={styles.guardCenter}>
        <ActivityIndicator size="large" />
        <Text style={styles.guardText}>Loading session...</Text>
      </View>
    );
  }

  if (!user || !role) {
    if (publicRoute) {
      return <>{children}</>;
    }
    return (
      <View style={styles.guardCenter}>
        <ActivityIndicator size="large" />
        <Text style={styles.guardText}>Redirecting to login...</Text>
      </View>
    );
  }

  if (publicRoute) {
    return (
      <View style={styles.guardCenter}>
        <ActivityIndicator size="large" />
        <Text style={styles.guardText}>Redirecting to your workspace...</Text>
      </View>
    );
  }

  if (!allowed) {
    return (
      <View style={styles.guardCenter}>
        <ActivityIndicator size="large" />
        <Text style={styles.guardText}>Redirecting...</Text>
      </View>
    );
  }

  return <>{children}</>;
}

function DrawerToggleButton() {
  const navigation = useNavigation();

  return (
    <TouchableOpacity
      onPress={() => (navigation as any).openDrawer()}
      style={styles.hamburger}
      accessibilityLabel="Open menu"
    >
      <Text style={styles.hamburgerText}>☰</Text>
    </TouchableOpacity>
  );
}

function CustomDrawerContent() {
  const { logout, user, hasModule, facilityName, facilityType } =
    useContext(AuthContext);

  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.replace("/");
  };

  const MenuItem = ({
    label,
    route,
    icon,
  }: {
    label: string;
    route: string;
    icon: string;
  }) => {
    const active = pathname === route;

    return (
      <TouchableOpacity
        onPress={() => router.push(route)}
        style={[
          styles.menuItem,
          active && styles.activeItem,
        ]}
      >
        <Text
          style={[
            styles.menuText,
            active && styles.activeText,
          ]}
        >
          {icon} {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const visibleSections = MENU_SECTIONS.map((section) => ({
    ...section,
    items: section.items.filter((item) => {
      const roleOk = canAccessRoute(user?.role, item.route);
      const moduleKey = MODULE_ROUTE_MAP[item.route];
      const moduleOk = moduleKey ? hasModule(moduleKey) : true;
      return roleOk && moduleOk;
    }),
  })).filter((section) => section.items.length > 0);

  const hasAnyAccess = visibleSections.length > 0;

  const displayFacilityName = facilityName || "MedTrack";
  const displayFacilityType = facilityType || "";

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🧠 MedTrack</Text>

        <Text style={styles.subtitle}>
          {displayFacilityName}
        </Text>

        {displayFacilityType ? (
          <Text style={styles.facilityBadge}>
            {displayFacilityType.replace(/_/g, " ")}
          </Text>
        ) : null}

        {user ? (
          <>
            <Text style={styles.userName}>
              {user.name}
            </Text>

            <Text style={styles.userRole}>
              Role: {user.role}
            </Text>
          </>
        ) : null}
      </View>

      {!hasAnyAccess ? (
        <View style={styles.noAccessBox}>
          <Text style={styles.noAccessText}>
            No modules available for this role at this facility.
          </Text>
        </View>
      ) : (
        visibleSections.map((section) => (
          <View key={section.title}>
            <Text style={styles.sectionTitle}>
              {section.title}
            </Text>

            {section.items.map((item) => (
              <MenuItem
                key={item.route}
                label={item.label}
                route={item.route}
                icon={item.icon}
              />
            ))}
          </View>
        ))
      )}

      <View style={styles.footer}>
        <TouchableOpacity
          onPress={handleLogout}
          style={styles.logoutBtn}
        >
          <Text style={styles.logoutText}>
            Logout
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <QueryClientProvider client={queryClient}>
          <AuthGuard>
            <Drawer
              screenOptions={{
                headerShown: true,
                headerTitle: "MedTrack",
                headerLeft: () => <DrawerToggleButton />,
                headerStyle: {
                  backgroundColor: "#ffffff",
                },
                headerTintColor: "#111827",
                drawerStyle: {
                  width: 280,
                },
              }}
              drawerContent={() => <CustomDrawerContent />}
            >
              <Drawer.Screen
                name="index"
                options={{
                  headerShown: false,
                }}
              />

                            <Drawer.Screen
                name="register-facility"
                options={{
                  headerShown: false,
                }}
              />

              <Drawer.Screen
                name="platform-admin"
                options={{
                  title: "Platform Console",
                }}
              />

              <Drawer.Screen
                name="dashboard"
                options={{
                  title: "Reception Dashboard",
                }}
              />

              <Drawer.Screen
                name="queue"
                options={{
                  title: "Patient Queue",
                }}
              />

              <Drawer.Screen
                name="add-patient"
                options={{
                  title: "Add Patient",
                }}
              />

              <Drawer.Screen
                name="patients"
                options={{
                  title: "Patients",
                }}
              />

              <Drawer.Screen
                name="patient-history"
                options={{
                  title: "Patient History",
                }}
              />

              <Drawer.Screen
                name="edit-patient"
                options={{
                  title: "Edit Patient",
                }}
              />

              <Drawer.Screen
                name="worklist"
                options={{
                  title: "Department Worklist",
                }}
              />

              <Drawer.Screen
                name="consultation"
                options={{
                  title: "Consultation",
                }}
              />

              <Drawer.Screen
                name="procedure"
                options={{
                  title: "Procedure Room",
                }}
              />

              <Drawer.Screen
                name="laboratory"
                options={{
                  title: "Laboratory",
                }}
              />

              <Drawer.Screen
                name="interpretation"
                options={{
                  title: "Result Interpretation",
                }}
              />

              <Drawer.Screen
                name="billing"
                options={{
                  title: "Billing",
                }}
              />
            
              <Drawer.Screen
                name="enrollments"
                options={{ title: "Enrollment Register" }}
              />

              <Drawer.Screen
                name="enroll-patient"
                options={{ title: "Enroll Patient" }}
              />

              <Drawer.Screen
                name="enrollment-detail"
                options={{ title: "Enrollment Card" }}
              />

              <Drawer.Screen
                name="billing-counter"
                options={{
                  title: "Billing Counter",
                }}
              />

              <Drawer.Screen
                name="patient-ledger"
                options={{
                  title: "Patient Ledger",
                }}
              />

              <Drawer.Screen
                name="daily-cashier"
                options={{
                  title: "Daily Cashier",
                }}
              />

              <Drawer.Screen
                name="bill-receipt"
                options={{
                  title: "Bill Receipt",
                }}
              />

              <Drawer.Screen
                name="payments"
                options={{
                  title: "Payments & Income",
                }}
              />

              <Drawer.Screen
                name="receipt"
                options={{
                  title: "Receipt",
                }}
              />

              <Drawer.Screen
                name="attendance"
                options={{
                  title: "Attendance",
                }}
              />

              <Drawer.Screen
                name="inventory"
                options={{
                  title: "Inventory",
                }}
              />

              <Drawer.Screen
                name="dispense"
                options={{
                  title: "Dispense",
                }}
              />

              <Drawer.Screen
                name="medical-form"
                options={{
                  title: "Medical Form",
                }}
              />

              <Drawer.Screen
                name="prescription-editor"
                options={{
                  title: "Edit Prescription",
                }}
              />

              <Drawer.Screen
                name="admin-overview"
                options={{
                  title: "Admin Overview",
                }}
              />

              <Drawer.Screen
                name="admin-users"
                options={{
                  title: "User Management",
                }}
              />

              <Drawer.Screen
                name="alerts"
                options={{
                  title: "Alerts",
                }}
              />

              <Drawer.Screen
                name="anomalies"
                options={{
                  title: "AI Alerts",
                }}
              />

              <Drawer.Screen
                name="history"
                options={{
                  title: "History",
                }}
              />
            </Drawer>
          </AuthGuard>
        </QueryClientProvider>
      </AuthProvider>
    </GestureHandlerRootView>
  );
}
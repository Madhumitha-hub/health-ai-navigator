/**
 * Role-based access control map.
 * Roles: admin (all), doctor (clinical), analyst (analytics/models).
 * Patient/user roles get dashboard + settings only.
 */
export type AppRole = "admin" | "doctor" | "analyst" | "patient" | string;

export type RoutePath =
  | "/dashboard"
  | "/predict"
  | "/analytics"
  | "/eda"
  | "/datasets"
  | "/models"
  | "/patients"
  | "/reports"
  | "/settings";

const PERMISSIONS: Record<string, RoutePath[]> = {
  admin: [
    "/dashboard",
    "/predict",
    "/analytics",
    "/eda",
    "/datasets",
    "/models",
    "/patients",
    "/reports",
    "/settings",
  ],
  doctor: ["/dashboard", "/predict", "/patients", "/reports", "/settings"],
  analyst: ["/dashboard", "/analytics", "/eda", "/datasets", "/models", "/settings"],
  patient: ["/dashboard", "/reports", "/settings"],
};

export function canAccess(role: string | null | undefined, path: RoutePath): boolean {
  if (!role) return false;
  const allowed = PERMISSIONS[role.toLowerCase()] ?? PERMISSIONS.patient;
  return allowed.includes(path);
}

export function allowedRoutes(role: string | null | undefined): RoutePath[] {
  if (!role) return [];
  return PERMISSIONS[role.toLowerCase()] ?? PERMISSIONS.patient;
}

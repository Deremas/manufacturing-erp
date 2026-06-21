const MODULES = new Set([
  "administration",
  "master-data",
  "procurement",
  "inventory",
  "production",
  "sales",
  "finance",
  "accounting",
  "hr",
  "fleet",
  "maintenance",
  "reports",
  "qc",
  "shifts",
]);

const PUBLIC_PATHS = ["/auth/login"];

export function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

export function isProtectedPath(pathname: string): boolean {
  if (pathname.startsWith("/api/auth")) return false;
  if (isPublicPath(pathname)) return false;
  if (pathname === "/" || pathname === "/dashboard") return true;
  if (pathname.startsWith("/api/")) return true;
  return MODULES.has(pathname.split("/").filter(Boolean)[0] ?? "");
}

function getModuleAndAction(
  pathname: string,
  method: string,
): { module: string; action: string | null } | null {
  const parts = pathname.split("/").filter(Boolean);
  const offset = parts[0] === "api" ? 1 : 0;
  const module = parts[offset];
  if (!module || !MODULES.has(module)) return null;

  let action = "view";
  if (method === "DELETE" || parts.includes("delete")) action = "delete";
  else if (parts.includes("create")) action = "create";
  else if (parts.includes("edit")) action = "edit";
  else if (parts.includes("approve")) action = "approve";
  else if (parts.includes("print")) action = "print";
  else if (parts.includes("export")) action = "export";

  return { module, action };
}

export function getRequiredPermission(
  pathname: string,
  method: string,
): string | null {
  if (pathname === "/" || pathname === "/dashboard") return null;
  if (pathname.startsWith("/auth")) return null;
  if (pathname.startsWith("/api/auth")) return null;

  const access = getModuleAndAction(pathname, method);
  if (!access) return null;
  return `${access.module}.${access.action}`;
}

export function hasRouteAccess(
  permissions: string[],
  pathname: string,
  method: string,
): boolean {
  if (permissions.includes("*")) return true;

  const requiredPermission = getRequiredPermission(pathname, method);
  if (!requiredPermission) return true;

  return permissions.includes(requiredPermission);
}

import { navigation } from "./navigation";

function collectRoutes() {
  const routes = new Set<string>();

  for (const item of navigation) {
    if (item.href) {
      routes.add(item.href);
    }

    for (const child of item.children ?? []) {
      routes.add(child.href);
    }
  }

  return Array.from(routes).sort((a, b) => b.length - a.length);
}

export const SHELL_ROUTE_PREFIXES = collectRoutes();

export function isShellRoute(pathname: string) {
  if (pathname === "/auth/login") return false;

  return SHELL_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

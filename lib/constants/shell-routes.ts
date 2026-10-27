import { PUBLIC_ROUTE_REGISTRY } from "@/lib/routing/registry";

import { navigation } from "./navigation";

function collectRoutes() {
  const routes = new Set<string>();

  for (const item of navigation) {
    if (item.href) {
      routes.add(item.href);
    }

    for (const child of item.children ?? []) {
      routes.add(child.href);
      for (const prefix of child.matchPrefixes ?? []) {
        routes.add(prefix);
      }
    }
  }

  for (const def of Object.values(PUBLIC_ROUTE_REGISTRY)) {
    routes.add(`/${def.module}/${def.code}`);
  }

  return Array.from(routes).sort((a, b) => b.length - a.length);
}

export const SHELL_ROUTE_PREFIXES = collectRoutes();

export function isShellRoute(pathname: string) {
  if (pathname.startsWith("/auth")) return false;
  if (pathname.startsWith("/public/inventory/stock/view")) return true;

  return SHELL_ROUTE_PREFIXES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

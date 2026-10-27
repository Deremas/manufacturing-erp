"use client";

import React, { useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { spacing } from "@/components/ui/spacing";
import { colors } from "@/components/ui/colors";
import { isShellRoute } from "@/lib/constants/shell-routes";

interface AppShellProps {
  children: React.ReactNode;
}

const COLLAPSED_COOKIE = "erp-sidebar-collapsed";
const DESKTOP_QUERY = "(min-width: 1024px)";

function isDesktopViewport() {
  return typeof window !== "undefined" && window.matchMedia(DESKTOP_QUERY).matches;
}

function clearCollapsedCookie() {
  document.cookie = `${COLLAPSED_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function enableSidebarAnimation() {
  document.documentElement.classList.add("sidebar-animate");
}

function applyDesktopCollapsed(collapsed: boolean) {
  document.documentElement.classList.toggle("sidebar-collapsed", collapsed);
  document.documentElement.classList.remove("sidebar-open");
}

function applyMobileOpen(open: boolean) {
  document.documentElement.classList.toggle("sidebar-open", open);
}

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");
  const isKnownRoute = isShellRoute(pathname);

  useEffect(() => {
    clearCollapsedCookie();
    document.documentElement.classList.remove("sidebar-collapsed", "sidebar-animate");
    const media = window.matchMedia(DESKTOP_QUERY);
    const syncViewport = () => {
      if (media.matches) {
        applyMobileOpen(false);
        return;
      }
      document.documentElement.classList.remove("sidebar-collapsed");
    };
    syncViewport();
    media.addEventListener("change", syncViewport);
    return () => media.removeEventListener("change", syncViewport);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    const onBeforePrint = () => root.classList.add("is-printing");
    const onAfterPrint = () => root.classList.remove("is-printing");
    window.addEventListener("beforeprint", onBeforePrint);
    window.addEventListener("afterprint", onAfterPrint);
    return () => {
      window.removeEventListener("beforeprint", onBeforePrint);
      window.removeEventListener("afterprint", onAfterPrint);
      root.classList.remove("is-printing");
    };
  }, []);

  if (isAuthRoute || !isKnownRoute) {
    return <>{children}</>;
  }

  const handleToggleSidebar = () => {
    enableSidebarAnimation();
    if (isDesktopViewport()) {
      const next = !document.documentElement.classList.contains("sidebar-collapsed");
      applyDesktopCollapsed(next);
      return;
    }
    applyMobileOpen(!document.documentElement.classList.contains("sidebar-open"));
  };

  const handleCloseSidebar = () => {
    if (isDesktopViewport()) return;
    enableSidebarAnimation();
    applyMobileOpen(false);
  };

  return (
    <div
      className="app-shell"
      style={{
        minHeight: "100vh",
        backgroundColor: colors.background,
        overflow: "visible",
      }}
    >
      <Sidebar onClose={handleCloseSidebar} />
      <div className="app-frame">
        <Topbar onToggleSidebar={handleToggleSidebar} />
        <main
          className="app-main"
          style={{
            overflowX: "auto",
            overflowY: "visible",
            padding: `${spacing.page.padding}px`,
            boxSizing: "border-box",
          }}
        >
          <div className="print-content" style={{ minWidth: 0, width: "100%", maxWidth: "100%" }}>{children}</div>
        </main>
      </div>
    </div>
  );
};

export default AppShell;

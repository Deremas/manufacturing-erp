"use client";

import React, { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { useMediaQuery } from "@/hooks/useMediaQuery";
import { spacing } from "@/components/ui/spacing";
import { colors } from "@/components/ui/colors";
import { isShellRoute } from "@/lib/constants/shell-routes";

interface AppShellProps {
  children: React.ReactNode;
}

const SIDEBAR_WIDTH = spacing.layout.sidebarWidth;

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const isDesktop = useMediaQuery("(min-width: 1024px)");
  const pathname = usePathname();
  const isAuthRoute = pathname.startsWith("/auth");
  const isKnownRoute = isShellRoute(pathname);

  useEffect(() => {
    if (isAuthRoute) return;
    setSidebarOpen(isDesktop);
  }, [isDesktop, isAuthRoute]);

  if (isAuthRoute || !isKnownRoute) {
    return <>{children}</>;
  }

  const handleToggleSidebar = () => setSidebarOpen((prev) => !prev);
  const handleCloseSidebar = () => setSidebarOpen(false);
  const sidebarVisible = sidebarOpen;
  const contentOffset = isDesktop && sidebarVisible ? SIDEBAR_WIDTH : 0;

  return (
    <div
      style={{
        height: "100vh",
        backgroundColor: colors.background,
        overflow: "hidden",
      }}
    >
      <Sidebar
        open={sidebarVisible}
        onClose={handleCloseSidebar}
        isDesktop={isDesktop}
      />
      <Topbar onToggleSidebar={handleToggleSidebar} leftOffset={contentOffset} />
      <main
        style={{
          position: "fixed",
          top: spacing.layout.topbarHeight,
          left: contentOffset,
          right: 0,
          bottom: 0,
          overflowY: "auto",
          overscrollBehavior: "contain",
          marginLeft: 0,
          padding: `${spacing.page.padding}px ${spacing.page.padding}px ${spacing.page.padding}px`,
          transition: "left 0.25s ease",
          boxSizing: "border-box",
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default AppShell;

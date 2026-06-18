"use client";

import React, { useState } from "react";
import Sidebar from "./Sidebar";
import Topbar from "./Topbar";
import { spacing } from "@/components/ui/spacing";
import { colors } from "@/components/ui/colors";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface AppShellProps {
  children: React.ReactNode;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIDEBAR_WIDTH = 260;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const AppShell: React.FC<AppShellProps> = ({ children }) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarCollapsed((prev) => !prev);
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: colors.background,
      }}
    >
      {/* Fixed sidebar */}
      <Sidebar collapsed={sidebarCollapsed} onToggle={handleToggleSidebar} />

      {/* Fixed topbar */}
      <Topbar onToggleSidebar={handleToggleSidebar} />

      {/* Main content area */}
      <main
        style={{
          marginLeft: sidebarCollapsed ? 0 : SIDEBAR_WIDTH,
          marginTop: spacing.layout.topbarHeight,
          padding: spacing.page.padding,
          minHeight: `calc(100vh - ${spacing.layout.topbarHeight}px)`,
          transition: "margin-left 0.25s ease",
        }}
      >
        {children}
      </main>
    </div>
  );
};

export default AppShell;

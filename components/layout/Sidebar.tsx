"use client";

import React from "react";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { navigation } from "@/lib/constants/navigation";
import SidebarNavItem from "./SidebarNavItem";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIDEBAR_WIDTH = 260;

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Sidebar: React.FC<SidebarProps> = ({ collapsed, onToggle }) => {
  return (
    <aside
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        width: collapsed ? 0 : SIDEBAR_WIDTH,
        height: "100vh",
        backgroundColor: colors.secondary[800],
        color: colors.text.inverse,
        display: "flex",
        flexDirection: "column",
        zIndex: 1000,
        overflow: collapsed ? "hidden" : "hidden",
        transition: "width 0.25s ease",
      }}
    >
      {/* ---- Brand / Logo ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: spacing.layout.topbarHeight,
          padding: collapsed ? "0" : `0 ${spacing.page.padding}px`,
          borderBottom: `1px solid ${colors.secondary[700]}`,
          flexShrink: 0,
          minWidth: SIDEBAR_WIDTH,
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontFamily: typography.fontFamily,
            fontWeight: typography.weights.bold,
            fontSize: "18px",
            letterSpacing: "-0.01em",
            whiteSpace: "nowrap",
            opacity: collapsed ? 0 : 1,
            transition: "opacity 0.15s ease",
          }}
        >
          KONEL ERP
        </span>
        <button
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          style={{
            background: "none",
            border: "none",
            color: colors.secondary[300],
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 4,
            borderRadius: radius.scale.sm,
            transition: "background 0.15s ease",
            opacity: collapsed ? 0 : 1,
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = colors.secondary[700])
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <polyline points="15 18 9 12 15 6" />
          </svg>
        </button>
      </div>

      {/* ---- Navigation Menu ---- */}
      <nav
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          padding: `${spacing.section.gap / 2}px 0`,
          minWidth: SIDEBAR_WIDTH,
        }}
      >
        {navigation.map((item) => (
          <SidebarNavItem
            key={item.label}
            item={item}
            collapsed={collapsed}
            depth={0}
          />
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;

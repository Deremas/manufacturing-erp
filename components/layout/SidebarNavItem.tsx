"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import type { NavItem } from "@/lib/constants/navigation";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SidebarNavItemProps {
  item: NavItem;
  collapsed: boolean;
  depth?: number;
}

// ---------------------------------------------------------------------------
// Icon resolver
// ---------------------------------------------------------------------------

function resolveIcon(iconName: string): React.ReactNode {
  const IconComponent = (LucideIcons as any)[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={20} />;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const SidebarNavItem: React.FC<SidebarNavItemProps> = ({
  item,
  collapsed,
  depth = 0,
}) => {
  const pathname = usePathname();
  const hasChildren = item.children && item.children.length > 0;

  // Determine if this item or any of its children is active
  const isActive = hasChildren
    ? item.children!.some(
        (child) => child.href && pathname.startsWith(child.href),
      )
    : item.href
      ? pathname === item.href || pathname.startsWith(item.href + "/")
      : false;

  // For parent items: track expanded state
  const [expanded, setExpanded] = useState(isActive);

  // Keep parent expanded when a child is active
  useEffect(() => {
    if (isActive && hasChildren) {
      setExpanded(true);
    }
  }, [isActive, hasChildren]);

  const handleToggle = useCallback(() => {
    if (hasChildren) {
      setExpanded((prev) => !prev);
    }
  }, [hasChildren]);

  // -----------------------------------------------------------------------
  // Styles
  // -----------------------------------------------------------------------

  const baseItemStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: collapsed ? 0 : 12,
    padding: collapsed
      ? "10px 0"
      : `${depth === 0 ? "10px" : "8px"} ${spacing.page.padding}px`,
    paddingLeft: collapsed
      ? 0
      : depth === 0
        ? spacing.page.padding
        : spacing.page.padding + depth * 16,
    justifyContent: collapsed ? "center" : "flex-start",
    textDecoration: "none",
    color: isActive ? colors.primary[300] : colors.secondary[300],
    backgroundColor: isActive ? "rgba(0, 150, 136, 0.12)" : "transparent",
    borderLeft: isActive
      ? `3px solid ${colors.primary[400]}`
      : "3px solid transparent",
    fontFamily: typography.fontFamily,
    fontSize:
      depth === 0
        ? typography.sizes.body.fontSize
        : typography.sizes.small.fontSize,
    fontWeight: isActive
      ? typography.weights.semibold
      : typography.weights.regular,
    transition: "all 0.15s ease",
    cursor: "pointer",
    whiteSpace: "nowrap",
    width: "100%",
    border: "none",
    background: isActive ? "rgba(0, 150, 136, 0.12)" : "transparent",
    outline: "none",
    boxSizing: "border-box",
  };

  const chevronStyle: React.CSSProperties = {
    marginLeft: "auto",
    display: "flex",
    alignItems: "center",
    transition: "transform 0.2s ease",
    transform: expanded ? "rotate(90deg)" : "rotate(0deg)",
    color: colors.secondary[400],
    flexShrink: 0,
  };

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  // If item has children, render as expandable parent
  if (hasChildren) {
    return (
      <div>
        <button
          onClick={handleToggle}
          title={collapsed ? item.label : undefined}
          style={baseItemStyle}
          onMouseEnter={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = colors.secondary[700];
            }
          }}
          onMouseLeave={(e) => {
            if (!isActive) {
              e.currentTarget.style.backgroundColor = "transparent";
            }
          }}
        >
          <span style={{ flexShrink: 0 }}>{resolveIcon(item.icon)}</span>
          {!collapsed && (
            <>
              <span style={{ flex: 1, textAlign: "left" }}>{item.label}</span>
              <span style={chevronStyle}>
                <LucideIcons.ChevronRight size={16} />
              </span>
            </>
          )}
        </button>

        {/* Children (only shown when expanded and sidebar is not collapsed) */}
        {!collapsed && expanded && (
          <div>
            {item.children!.map((child) => (
              <SidebarNavItem
                key={child.label}
                item={child}
                collapsed={collapsed}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  // Single item: render as Link
  return (
    <Link
      href={item.href || "#"}
      title={collapsed ? item.label : undefined}
      style={baseItemStyle}
      onMouseEnter={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = colors.secondary[700];
        }
      }}
      onMouseLeave={(e) => {
        if (!isActive) {
          e.currentTarget.style.backgroundColor = "transparent";
        }
      }}
    >
      <span style={{ flexShrink: 0 }}>{resolveIcon(item.icon)}</span>
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );
};

export default SidebarNavItem;

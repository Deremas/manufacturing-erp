"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import * as LucideIcons from "lucide-react";
import { navigation } from "@/lib/constants/navigation";
import type { NavItem } from "@/lib/constants/navigation";
import { spacing } from "@/components/ui/spacing";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SidebarProps {
  open: boolean;
  onClose: () => void;
  isDesktop: boolean;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SIDEBAR_WIDTH = spacing.layout.sidebarWidth;

// ---------------------------------------------------------------------------
// Icon resolver
// ---------------------------------------------------------------------------

function resolveIcon(iconName: string, size: number = 22): React.ReactNode {
  const IconComponent = (LucideIcons as any)[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} />;
}

function BrandMark() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="3" width="8" height="8" rx="1.8" />
      <rect x="13" y="3" width="8" height="8" rx="1.8" />
      <rect x="3" y="13" width="8" height="8" rx="1.8" />
      <rect x="13" y="13" width="8" height="8" rx="1.8" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Child link component
// ---------------------------------------------------------------------------

interface ChildLinkProps {
  title: string;
  href: string;
  isActive: boolean;
  onChildClick?: () => void;
}

const ChildLink: React.FC<ChildLinkProps> = ({
  title,
  href,
  isActive,
  onChildClick,
}) => (
  <Link
    href={href}
    title={title}
    onClick={onChildClick}
    style={{
      display: "flex",
      alignItems: "center",
      minHeight: 38,
      paddingLeft: 54,
      paddingRight: 18,
      textDecoration: "none",
      color: isActive ? colors.primary[700] : colors.text.primary,
      backgroundColor: isActive ? colors.primary[50] : "transparent",
      borderStyle: "solid",
      borderWidth: "0 0 0 4px",
      borderColor: `transparent transparent transparent ${
        isActive ? colors.primary[600] : "transparent"
      }`,
      fontSize: 14,
      fontWeight: isActive ? 600 : 400,
      transition: "all 0.15s ease",
      whiteSpace: "nowrap",
      width: "100%",
      boxSizing: "border-box",
      borderRadius: 0,
    }}
    onMouseEnter={(e) => {
      if (!isActive) e.currentTarget.style.backgroundColor = colors.secondary[50];
    }}
    onMouseLeave={(e) => {
      if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
    }}
  >
    {title}
  </Link>
);

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

const Sidebar: React.FC<SidebarProps> = ({ open, onClose, isDesktop }) => {
  const pathname = usePathname();
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [initialized, setInitialized] = useState(false);

  React.useEffect(() => {
    if (!initialized) {
      const activeModules = navigation
        .filter((item) =>
          item.children?.some(
            (child) =>
              child.href &&
              (pathname === child.href || pathname.startsWith(child.href + "/")),
          ),
        )
        .map((item) => item.title);
      if (activeModules.length > 0) {
        setOpenModules(activeModules);
      }
      setInitialized(true);
    }
  }, [pathname, initialized]);

  const toggleModule = (title: string) => {
    setOpenModules((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title],
    );
  };

  const hasActiveChild = (item: NavItem): boolean => {
    if (!item.children) return false;
    return item.children.some(
      (child) =>
        child.href &&
        (pathname === child.href || pathname.startsWith(child.href + "/")),
    );
  };

  const handleChildClick = () => {
    if (!isDesktop) {
      onClose();
    }
  };

  const sidebarTransform = open ? "translateX(0)" : "translateX(-100%)";

  return (
    <>
      {!isDesktop && open && (
        <div
          onClick={onClose}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            backgroundColor: "rgba(0,0,0,0.45)",
          }}
        />
      )}

      <aside
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          zIndex: 50,
          width: SIDEBAR_WIDTH,
          height: "100vh",
          transform: sidebarTransform,
          transition: "transform 0.25s ease",
          backgroundColor: colors.surface,
          borderRight: `1px solid ${colors.border}`,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          willChange: "transform",
        }}
      >
        <div
          style={{
            height: spacing.layout.topbarHeight,
            display: "flex",
            alignItems: "center",
            gap: 12,
            padding: "0 24px",
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              backgroundColor: colors.primary[600],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: colors.text.inverse,
              flexShrink: 0,
              boxShadow: "0 6px 14px rgba(15, 139, 141, 0.18)",
            }}
          >
            <BrandMark />
          </div>
          <div
            style={{
              fontFamily: typography.fontFamily,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: "-0.03em",
              color: colors.text.primary,
              lineHeight: 1.1,
              whiteSpace: "nowrap",
            }}
          >
            NEW ERP
          </div>
        </div>

        <style>{`
          .sidebar-scroll::-webkit-scrollbar {
            width: 6px;
          }
          .sidebar-scroll::-webkit-scrollbar-track {
            background: transparent;
          }
          .sidebar-scroll::-webkit-scrollbar-thumb {
            background: #cbd5e1;
            border-radius: 9999px;
          }
          .sidebar-scroll::-webkit-scrollbar-thumb:hover {
            background: #94a3b8;
          }
        `}</style>

        <nav
          className="sidebar-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            paddingBottom: 16,
            scrollbarWidth: "thin",
            scrollbarColor: "#cbd5e1 transparent",
            overscrollBehavior: "contain",
          }}
        >
          {(() => {
            let currentSection: string | undefined;

            return navigation.map((item, index) => {
              const isNewSection = item.section !== currentSection;
              const showSectionLabel = !!item.section && isNewSection;
              const marginTop = index > 0 ? (isNewSection ? 16 : 4) : 0;

              currentSection = item.section;

              const hasChildren = item.children && item.children.length > 0;
              const isParentActive = hasChildren ? hasActiveChild(item) : false;
              const isLinkActive =
                !hasChildren && item.href
                  ? pathname === item.href || pathname.startsWith(item.href + "/")
                  : false;
              const isActive = isParentActive || isLinkActive;
              const isExpanded = openModules.includes(item.title);

              const iconColor = isActive ? colors.primary[600] : colors.text.secondary;
              const textColor = isActive ? colors.primary[700] : colors.text.primary;
              const bgColor = isActive ? colors.primary[50] : "transparent";

              const itemStyle: React.CSSProperties = {
                display: "flex",
                alignItems: "center",
                gap: 12,
                minHeight: 46,
                paddingInline: 18,
                textDecoration: "none",
                color: textColor,
                backgroundColor: bgColor,
                borderStyle: "solid",
                borderWidth: `0 0 0 ${isActive ? 4 : 0}px`,
                borderColor: `transparent transparent transparent ${isActive ? colors.primary[600] : "transparent"}`,
                fontSize: 14,
                fontWeight: isActive ? 600 : 400,
                transition: "all 0.15s ease",
                cursor: "pointer",
                whiteSpace: "nowrap",
                width: "100%",
                outline: "none",
                boxSizing: "border-box",
                borderRadius: 0,
              };

              return (
                <div key={item.title} style={{ marginTop }}>
                  {showSectionLabel && (
                    <div
                      style={{
                        paddingInline: 18,
                        marginTop: 18,
                        marginBottom: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        color: colors.text.secondary,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {item.section}
                    </div>
                  )}

                  {hasChildren ? (
                    <div>
                      <button
                        onClick={() => toggleModule(item.title)}
                        title={item.title}
                        style={itemStyle}
                        onMouseEnter={(e) => {
                          if (!isActive)
                            e.currentTarget.style.backgroundColor = colors.secondary[50];
                        }}
                        onMouseLeave={(e) => {
                          if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                        }}
                      >
                        <span
                          style={{
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            color: iconColor,
                          }}
                        >
                          {resolveIcon(item.icon, 22)}
                        </span>
                        <span style={{ flex: 1, textAlign: "left" }}>{item.title}</span>
                        <span
                          style={{
                            flexShrink: 0,
                            display: "flex",
                            alignItems: "center",
                            color: colors.text.secondary,
                            marginLeft: "auto",
                            transition: "transform 0.2s ease",
                            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
                          }}
                        >
                          <svg
                            width="26"
                            height="26"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M9 18l6-6-6-6" />
                          </svg>
                        </span>
                      </button>

                      {isExpanded && (
                        <div>
                          {item.children!.map((child) => {
                            const isChildActive =
                              pathname === child.href ||
                              pathname.startsWith(child.href + "/");
                            return (
                              <ChildLink
                                key={child.title}
                                title={child.title}
                                href={child.href}
                                isActive={isChildActive}
                                onChildClick={handleChildClick}
                              />
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <Link
                      href={item.href || "#"}
                      title={item.title}
                      onClick={handleChildClick}
                      style={itemStyle}
                      onMouseEnter={(e) => {
                        if (!isActive)
                          e.currentTarget.style.backgroundColor = colors.secondary[50];
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
                      }}
                    >
                      <span
                        style={{
                          flexShrink: 0,
                          display: "flex",
                          alignItems: "center",
                          color: iconColor,
                        }}
                      >
                        {resolveIcon(item.icon, 22)}
                      </span>
                      <span>{item.title}</span>
                    </Link>
                  )}
                </div>
              );
            });
          })()}
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;

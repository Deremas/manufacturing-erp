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
import { useAccess } from "@/lib/auth/use-access";

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface SidebarProps {
  onClose: () => void;
}

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

function isChildRouteActive(pathname: string, child: { href: string; matchPrefixes?: string[]; exact?: boolean }) {
  const prefixMatch = Boolean(child.matchPrefixes?.some((prefix) => pathname === prefix || pathname.startsWith(prefix + "/")));
  if (child.exact) return pathname === child.href || prefixMatch;
  return pathname === child.href
    || pathname.startsWith(child.href + "/")
    || prefixMatch;
}

const ChildLink: React.FC<ChildLinkProps & { compact?: boolean; factory?: boolean }> = ({
  title,
  href,
  isActive,
  onChildClick,
  compact = false,
  factory = false,
}) => (
  <Link
    href={href}
    title={title}
    onClick={onChildClick}
    style={{
      display: "flex",
      alignItems: "center",
      minHeight: factory ? 44 : compact ? 36 : 40,
      marginLeft: factory ? 0 : compact ? 18 : 26,
      marginRight: factory ? 8 : compact ? 10 : 14,
      paddingLeft: factory ? 52 : compact ? 14 : 16,
      paddingRight: factory ? 12 : compact ? 14 : 16,
      textDecoration: "none",
      color: isActive ? colors.primary[700] : colors.text.primary,
      backgroundColor: isActive ? (factory ? colors.primary[50] : colors.surface) : "transparent",
      border: factory ? "1px solid transparent" : isActive ? `1px solid ${colors.primary[100]}` : "1px solid transparent",
      borderLeft: factory && isActive ? `2px solid ${colors.primary[600]}` : undefined,
      fontSize: factory ? 14 : compact ? 12 : 13,
      fontWeight: isActive ? (factory ? 500 : 600) : 400,
      transition: "background-color 180ms ease, color 180ms ease",
      whiteSpace: "nowrap",
      overflow: "hidden",
      textOverflow: "ellipsis",
      width: factory ? "calc(100% - 8px)" : compact ? "calc(100% - 28px)" : "calc(100% - 40px)",
      boxSizing: "border-box",
      borderRadius: factory ? 8 : 12,
      boxShadow: !factory && isActive ? "0 8px 18px rgba(15, 23, 42, 0.05)" : "none",
      position: "relative",
    }}
    onMouseEnter={(e) => {
      if (!isActive) e.currentTarget.style.backgroundColor = colors.secondary[50];
    }}
    onMouseLeave={(e) => {
      if (!isActive) e.currentTarget.style.backgroundColor = "transparent";
    }}
  >
    {isActive && !factory ? (
      <span
        style={{
          position: "absolute",
          left: 8,
          top: "50%",
          transform: "translateY(-50%)",
          width: 6,
          height: 6,
          borderRadius: "999px",
          backgroundColor: colors.primary[600],
        }}
      />
    ) : null}
    {title}
  </Link>
);

function NavCountBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  const label = count > 99 ? "99+" : String(count);
  return (
    <span
      style={{
        marginLeft: "auto",
        minWidth: 22,
        height: 22,
        padding: "0 7px",
        borderRadius: 999,
        backgroundColor: colors.danger[500],
        color: colors.text.inverse,
        fontSize: 11,
        fontWeight: 700,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        lineHeight: 1,
      }}
    >
      {label}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Sidebar component
// ---------------------------------------------------------------------------

const Sidebar: React.FC<SidebarProps> = ({ onClose }) => {
  const pathname = usePathname();
  const { visibleNavigation, ready } = useAccess();
  const navItems = visibleNavigation(navigation);
  const [compact, setCompact] = useState(false);
  const [openModules, setOpenModules] = useState<string[]>([]);
  const [approvalInboxCount, setApprovalInboxCount] = useState(0);

  React.useEffect(() => {
    const media = window.matchMedia("(max-width: 1199px)");
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    let cancelled = false;

    fetch("/api/approval-inbox")
      .then((response) => (response.ok ? response.json() : { count: 0 }))
      .then((data: { count?: number }) => {
        if (!cancelled) setApprovalInboxCount(Number(data.count ?? 0));
      })
      .catch(() => {
        if (!cancelled) setApprovalInboxCount(0);
      });

    return () => {
      cancelled = true;
    };
  }, [ready, pathname]);

  React.useEffect(() => {
    if (!ready) return;
    const activeModules = navItems
      .filter((item) =>
        (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`)))
        || item.children?.some(
          (child) =>
            child.href && isChildRouteActive(pathname, child),
        ),
      )
      .map((item) => item.title);
    if (activeModules.length > 0) {
      setOpenModules((prev) => Array.from(new Set([...prev, ...activeModules])));
    }
  }, [pathname, ready]);

  const toggleModule = (title: string) => {
    setOpenModules((prev) =>
      prev.includes(title)
        ? prev.filter((item) => item !== title)
        : [...prev, title],
    );
  };

  const hasActiveChild = (item: NavItem): boolean => {
    if (item.href && (pathname === item.href || pathname.startsWith(`${item.href}/`))) {
      return true;
    }
    if (!item.children) return false;
    return item.children.some(
      (child) =>
        child.href && isChildRouteActive(pathname, child),
    );
  };

  const handleChildClick = () => {
    if (typeof window !== "undefined" && !window.matchMedia("(min-width: 1024px)").matches) {
      onClose();
    }
  };

  return (
    <>
      <div className="app-sidebar-backdrop" onClick={onClose} />

      <aside
        className="app-sidebar"
        style={{
          backgroundColor: colors.surface,
          borderRight: `1px solid ${colors.border}`,
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        }}
      >
        <div
          style={{
            height: compact ? 68 : spacing.layout.topbarHeight,
            display: "flex",
            alignItems: "center",
            gap: compact ? 10 : 12,
            padding: compact ? "0 18px" : "0 24px",
            borderBottom: `1px solid ${colors.border}`,
            flexShrink: 0,
          }}
        >
          <div
            style={{
              width: compact ? 32 : 34,
              height: compact ? 32 : 34,
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
              fontSize: compact ? 15 : 16,
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
          className="sidebar-scroll app-sidebar-scroll"
          style={{
            flex: 1,
            overflowY: "auto",
            overflowX: "hidden",
            paddingBottom: compact ? 12 : 16,
            scrollbarWidth: "thin",
            scrollbarColor: "#cbd5e1 transparent",
            overscrollBehavior: "contain",
          }}
        >
          {(() => {
            let currentSection: string | undefined;

            return navItems.map((item, index) => {
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
              const isFactoryGroup = item.title === "Production";
              const isExpanded = openModules.includes(item.title);
              const isParentOpenState = hasChildren && (isExpanded || isParentActive);

              const iconColor = isParentActive || isLinkActive ? colors.primary[700] : colors.text.secondary;
              const textColor = isParentActive || isLinkActive ? colors.primary[800] : colors.text.primary;
              const bgColor = isLinkActive
                ? colors.primary[50]
                : isParentActive
                  ? colors.primary[100]
                  : isExpanded
                    ? colors.secondary[50]
                  : "transparent";

              const itemStyle: React.CSSProperties = {
                display: "flex",
                alignItems: "center",
                gap: compact ? 10 : 12,
                minHeight: isFactoryGroup ? 56 : compact ? 42 : 46,
                paddingInline: compact ? 16 : 18,
                textDecoration: "none",
                color: textColor,
                backgroundColor: bgColor,
                border: isParentActive
                  ? `1px solid ${colors.primary[200]}`
                  : isExpanded
                    ? `1px solid ${colors.secondary[100]}`
                  : "1px solid transparent",
                fontSize: compact ? 13 : 14,
                fontWeight: isParentActive || isLinkActive ? 700 : isExpanded ? 600 : 400,
                transition: "all 0.15s ease",
                cursor: "pointer",
                whiteSpace: "nowrap",
                width: compact ? "calc(100% - 20px)" : "calc(100% - 24px)",
                outline: "none",
                boxSizing: "border-box",
                borderRadius: 14,
                marginInline: compact ? 10 : 12,
                boxShadow: isParentActive
                  ? "0 10px 24px rgba(0, 137, 123, 0.08)"
                  : "none",
              };

              return (
                <div key={item.title} style={{ marginTop }}>
                  {showSectionLabel && (
                    <div
                      style={{
                        paddingInline: compact ? 16 : 18,
                        marginTop: compact ? 14 : 18,
                        marginBottom: compact ? 6 : 8,
                        fontSize: compact ? 10 : 11,
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
                          {resolveIcon(item.icon, isFactoryGroup ? 20 : compact ? 20 : 22)}
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
                            transform: isParentOpenState ? "rotate(90deg)" : "rotate(0deg)",
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

                      {isParentOpenState && (
                        <div style={{ paddingTop: 6, paddingBottom: 4 }}>
                          {item.children!.map((child) => {
                            const isChildActive = isChildRouteActive(pathname, child);
                            return (
                              <ChildLink
                                key={child.title}
                                title={child.title}
                                href={child.href}
                                isActive={isChildActive}
                                onChildClick={handleChildClick}
                                compact={compact}
                                factory={isFactoryGroup}
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
                      <span style={{ flex: 1 }}>{item.title}</span>
                      {item.href === "/approval-inbox" ? <NavCountBadge count={approvalInboxCount} /> : null}
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

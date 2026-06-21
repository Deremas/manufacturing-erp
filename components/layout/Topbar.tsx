"use client";

import React, { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { spacing } from "@/components/ui/spacing";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { CurrentUser } from "@/lib/auth/current-user";

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

const BellIcon = (
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
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 01-3.46 0" />
  </svg>
);

const HamburgerIcon = (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function derivePageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";
  const last = segments[segments.length - 1];
  return last.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TopbarProps {
  onToggleSidebar: () => void;
  leftOffset: number;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar, leftOffset }) => {
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    getCurrentUser().then((u) => setUser(u));
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const pageTitle = derivePageTitle(pathname);
  const initials = user ? getInitials(user.name) : "SA";
  const displayName = user?.name ?? "System Administrator";
  const displayEmail = user?.email ?? "admin";

  const handleLogout = async () => {
    setDropdownOpen(false);
    await signOut({ callbackUrl: "/auth/login" });
  };

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: leftOffset,
        right: 0,
        height: spacing.layout.topbarHeight,
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "0 24px 0 16px",
        zIndex: 40,
        transition: "left 0.25s ease",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          minWidth: 0,
          flexShrink: 0,
        }}
      >
        <button
          type="button"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          style={{
            width: 38,
            height: 38,
            background: "transparent",
            border: "1px solid transparent",
            color: colors.text.secondary,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 0,
            borderRadius: radius.scale.md,
            transition: "background 0.15s ease",
            flexShrink: 0,
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = colors.secondary[50])
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          {HamburgerIcon}
        </button>
      </div>

      <div
        style={{
          position: "absolute",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          fontFamily: typography.fontFamily,
          fontSize: typography.sizes.h5.fontSize,
          fontWeight: typography.weights.semibold,
          color: colors.text.primary,
          pointerEvents: "none",
          maxWidth: "50%",
          whiteSpace: "nowrap",
          overflow: "hidden",
          textOverflow: "ellipsis",
        }}
      >
        {pageTitle}
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          paddingRight: 20,
        }}
      >
        <button
          aria-label="Notifications"
          style={{
            background: "none",
            border: "none",
            color: colors.text.secondary,
            cursor: "pointer",
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 6,
            borderRadius: radius.scale.sm,
            transition: "background 0.15s ease",
          }}
          onMouseOver={(e) =>
            (e.currentTarget.style.backgroundColor = colors.secondary[50])
          }
          onMouseOut={(e) =>
            (e.currentTarget.style.backgroundColor = "transparent")
          }
        >
          {BellIcon}
          <span
            style={{
              position: "absolute",
              top: 2,
              right: 2,
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: colors.danger[500],
            }}
          />
        </button>

        <div ref={dropdownRef} style={{ position: "relative" }}>
          <button
            onClick={() => setDropdownOpen((prev) => !prev)}
            aria-haspopup="true"
            aria-expanded={dropdownOpen}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              background: "none",
              border: "none",
              cursor: "pointer",
              padding: "4px 8px",
              borderRadius: radius.scale.md,
              transition: "background 0.15s ease",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = colors.secondary[50])
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "transparent")
            }
          >
            <div
              style={{
                width: 32,
                height: 32,
                borderRadius: radius.components.badge,
                backgroundColor: colors.primary[600],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: colors.text.inverse,
                fontFamily: typography.fontFamily,
                fontWeight: typography.weights.semibold,
                fontSize: "13px",
                flexShrink: 0,
              }}
            >
              {initials}
            </div>
            <div style={{ textAlign: "left" }}>
              <div
                style={{
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.small.fontSize,
                  fontWeight: typography.weights.medium,
                  color: colors.text.primary,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                }}
              >
                {displayName}
              </div>
              <div
                style={{
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.caption.fontSize,
                  color: colors.text.secondary,
                  lineHeight: 1.2,
                  whiteSpace: "nowrap",
                }}
              >
                {displayEmail}
              </div>
            </div>
          </button>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                marginTop: 6,
                minWidth: 180,
                backgroundColor: colors.surface,
                border: `1px solid ${colors.border}`,
                borderRadius: radius.scale.lg,
                boxShadow: "0 8px 24px rgba(0,0,0,0.1)",
                padding: "6px 0",
                zIndex: 1001,
              }}
            >
              {["Profile", "Settings", "Logout"].map((item, index) => {
                const isLogout = item === "Logout";
                return (
                <button
                  key={item}
                  type="button"
                  onClick={isLogout ? handleLogout : () => setDropdownOpen(false)}
                  style={{
                    width: "100%",
                    display: "block",
                    padding: "8px 16px",
                    fontFamily: typography.fontFamily,
                    fontSize: typography.sizes.small.fontSize,
                    color:
                      isLogout
                        ? colors.danger[600]
                        : colors.text.primary,
                    textDecoration: "none",
                    transition: "background 0.15s ease",
                    borderBottom:
                      index < 2 ? `1px solid ${colors.border}` : "none",
                    background: "transparent",
                    borderLeft: "none",
                    borderRight: "none",
                    borderTop: "none",
                    textAlign: "left",
                    cursor: "pointer",
                  }}
                  onMouseOver={(e) =>
                    (e.currentTarget.style.backgroundColor =
                      colors.secondary[50])
                  }
                  onMouseOut={(e) =>
                    (e.currentTarget.style.backgroundColor = "transparent")
                  }
                >
                  {item}
                </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;

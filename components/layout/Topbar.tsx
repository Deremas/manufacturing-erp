"use client";

import React, { useState, useRef, useEffect } from "react";
import { spacing } from "@/components/ui/spacing";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ---------------------------------------------------------------------------
// Inline SVG icons
// ---------------------------------------------------------------------------

const HamburgerIcon = (
  <svg
    width="22"
    height="22"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="3" y1="6" x2="21" y2="6" />
    <line x1="3" y1="12" x2="21" y2="12" />
    <line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

const SearchIcon = (
  <svg
    width="18"
    height="18"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="11" cy="11" r="8" />
    <line x1="21" y1="21" x2="16.65" y2="16.65" />
  </svg>
);

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

const ChevronDownIcon = (
  <svg
    width="16"
    height="16"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

interface TopbarProps {
  onToggleSidebar: () => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
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

  return (
    <header
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        height: spacing.layout.topbarHeight,
        backgroundColor: colors.surface,
        borderBottom: `1px solid ${colors.border}`,
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: `0 ${spacing.page.padding}px`,
        zIndex: 999,
      }}
    >
      {/* ---- Left: Hamburger ---- */}
      <button
        onClick={onToggleSidebar}
        aria-label="Toggle sidebar"
        style={{
          background: "none",
          border: "none",
          color: colors.text.secondary,
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 8,
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
        {HamburgerIcon}
      </button>

      {/* ---- Center: Search bar ---- */}
      <div
        style={{
          flex: 1,
          maxWidth: 400,
          marginLeft: spacing.page.gap,
          position: "relative",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: 12,
            top: "50%",
            transform: "translateY(-50%)",
            color: colors.text.muted,
            display: "flex",
            alignItems: "center",
            pointerEvents: "none",
          }}
        >
          {SearchIcon}
        </div>
        <input
          type="text"
          placeholder="Search modules, records..."
          style={{
            width: "100%",
            height: 38,
            paddingLeft: 40,
            paddingRight: 12,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.components.input,
            backgroundColor: colors.secondary[50],
            fontFamily: typography.fontFamily,
            fontSize: typography.sizes.small.fontSize,
            color: colors.text.primary,
            outline: "none",
            transition: "border-color 0.15s ease, box-shadow 0.15s ease",
            boxSizing: "border-box",
          }}
          onFocus={(e) => {
            e.currentTarget.style.borderColor = colors.primary[400];
            e.currentTarget.style.boxShadow = `0 0 0 3px ${colors.primary[50]}`;
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = colors.border;
            e.currentTarget.style.boxShadow = "none";
          }}
        />
      </div>

      {/* ---- Right: Notifications + User ---- */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          marginLeft: "auto",
        }}
      >
        {/* Notification bell */}
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

        {/* User avatar + dropdown */}
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
            {/* Avatar */}
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
              JK
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
                John Kamau
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
                Administrator
              </div>
            </div>
            <span
              style={{
                color: colors.text.muted,
                display: "flex",
                alignItems: "center",
                transition: "transform 0.2s ease",
                transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              {ChevronDownIcon}
            </span>
          </button>

          {/* Dropdown menu */}
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
              {["Profile", "Settings", "Logout"].map((item, index) => (
                <a
                  key={item}
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setDropdownOpen(false);
                  }}
                  style={{
                    display: "block",
                    padding: "8px 16px",
                    fontFamily: typography.fontFamily,
                    fontSize: typography.sizes.small.fontSize,
                    color:
                      item === "Logout"
                        ? colors.danger[600]
                        : colors.text.primary,
                    textDecoration: "none",
                    transition: "background 0.15s ease",
                    borderBottom:
                      index < 2 ? `1px solid ${colors.border}` : "none",
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
                </a>
              ))}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Topbar;

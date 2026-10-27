"use client";

import React, { useEffect, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LogOut, Settings, User } from "lucide-react";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { getCurrentUser } from "@/lib/auth/current-user";
import type { CurrentUser } from "@/lib/auth/current-user";
import { useAccess } from "@/lib/auth/use-access";
import { PUBLIC_ROUTE_REGISTRY } from "@/lib/routing/registry";

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

const ChevronDownIcon = (
  <svg
    width="14"
    height="14"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="6 9 12 15 18 9" />
  </svg>
);

function derivePageTitle(pathname: string): string {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return "Dashboard";

  const formatSegment = (segment: string) =>
    segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const singularize = (segment: string) => {
    const formatted = formatSegment(segment);
    if (formatted.endsWith("ies")) {
      return `${formatted.slice(0, -3)}y`;
    }
    if (formatted.endsWith("s")) {
      return formatted.slice(0, -1);
    }
    return formatted;
  };

  const looksLikeRecordId = (segment: string) =>
    /^\d+$/.test(segment) ||
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      segment,
    ) ||
    /^[a-z]+-[0-9a-f-]{8,}$/i.test(segment);

  const last = segments[segments.length - 1] ?? "";
  const previous = segments[segments.length - 2] ?? "";
  const moduleSegment = segments[0] ?? "";
  const codeSegment = segments[1] ?? "";

  if (
    (previous === "view" || previous === "edit" || previous === "print") &&
    looksLikeRecordId(last)
  ) {
    const def = Object.values(PUBLIC_ROUTE_REGISTRY).find(
      (route) => route.module === moduleSegment && route.code === codeSegment,
    );
    if (def) {
      if (previous === "edit") return `Edit ${def.label}`;
      if (previous === "print") return `Print ${def.label}`;
      return def.label;
    }
  }

  if (last === "create" && previous) {
    return `Create ${singularize(previous)}`;
  }

  if (last === "edit") {
    const target = segments[segments.length - 2] ?? previous;
    const recordOwner = looksLikeRecordId(target)
      ? segments[segments.length - 3] ?? ""
      : target;
    return recordOwner ? `Edit ${singularize(recordOwner)}` : "Edit Record";
  }

  if (looksLikeRecordId(last) && previous) {
    return `${singularize(previous)} Details`;
  }

  return formatSegment(last);
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((part) => part.charAt(0).toUpperCase())
    .slice(0, 2)
    .join("");
}

interface TopbarProps {
  onToggleSidebar: () => void;
}

const Topbar: React.FC<TopbarProps> = ({ onToggleSidebar }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { canPath } = useAccess();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileWrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getCurrentUser().then((u) => setUser(u));
  }, []);

  useEffect(() => {
    if (!profileOpen) return;

    const onPointerDown = (event: MouseEvent) => {
      if (!profileWrapRef.current?.contains(event.target as Node)) {
        setProfileOpen(false);
      }
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setProfileOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [profileOpen]);

  const pageTitle = derivePageTitle(pathname);
  const initials = user ? getInitials(user.name) : "SA";
  const displayName = user?.name ?? "System Administrator";
  const displayRole = user?.role ?? "User";

  const closeProfile = () => setProfileOpen(false);

  const handleLogout = async () => {
    closeProfile();
    await signOut({ callbackUrl: "/auth/login" });
  };

  const goTo = (href: string) => {
    closeProfile();
    router.push(href);
  };

  return (
    <>
      <header
        className="app-topbar no-print"
        style={{
          backgroundColor: colors.surface,
          borderBottom: `1px solid ${colors.border}`,
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "0 12px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", flexShrink: 0 }}>
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
          className="app-topbar-title"
          title={pageTitle}
          style={{
            flex: 1,
            minWidth: 0,
            textAlign: "center",
            fontFamily: typography.fontFamily,
            fontSize: typography.sizes.h5.fontSize,
            fontWeight: typography.weights.semibold,
            color: colors.text.primary,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {pageTitle}
        </div>

        <div className="app-topbar-right">
          <button
            type="button"
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
              flexShrink: 0,
            }}
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

          <div className="app-topbar-profile-wrap" ref={profileWrapRef}>
            <button
              type="button"
              className="app-topbar-profile"
              onClick={() => setProfileOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={profileOpen}
              aria-label="Open profile menu"
              title={`${displayName} · ${displayRole}`}
            >
              <span className="app-topbar-avatar">{initials}</span>
              <span className="app-topbar-user-text">
                <span className="app-topbar-user-name">{displayName}</span>
                <span className="app-topbar-user-role">{displayRole}</span>
              </span>
              <span
                className="app-topbar-profile-caret"
                style={{ transform: profileOpen ? "rotate(180deg)" : "none" }}
              >
                {ChevronDownIcon}
              </span>
            </button>

            {profileOpen ? (
              <div className="app-profile-menu" role="menu" aria-label="Profile">
                {user?.id ? (
                  <button
                    type="button"
                    role="menuitem"
                    className="app-profile-menu-item"
                    onClick={() => goTo(`/administration/users/${user.id}`)}
                  >
                    <User size={16} />
                    My Profile
                  </button>
                ) : null}
                {canPath("/administration/settings") ? (
                <button
                  type="button"
                  role="menuitem"
                  className="app-profile-menu-item"
                  onClick={() => goTo("/administration/settings")}
                >
                  <Settings size={16} />
                  Settings
                </button>
                ) : null}
                <div className="app-profile-menu-divider" />
                <button
                  type="button"
                  role="menuitem"
                  className="app-profile-menu-item is-danger"
                  onClick={handleLogout}
                >
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            ) : null}
          </div>
        </div>
      </header>
    </>
  );
};

export default Topbar;

"use client";

import Link from "next/link";

import { colors } from "@/components/ui/colors";
import { administrationSettingsTabs, type AdministrationSettingsTab } from "@/features/administration/settings/settings-config";

export function AdministrationSettingsTabs({ activeTab }: { activeTab: AdministrationSettingsTab }) {
  return (
    <div style={{ padding: "20px 24px 0", background: "#f8fafc" }}>
      <div
        role="tablist"
        aria-label="Administration settings"
        style={{
          display: "flex",
          gap: 6,
          overflowX: "auto",
          padding: 6,
          border: `1px solid ${colors.border}`,
          borderRadius: 16,
          background: colors.surface,
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
          scrollbarWidth: "thin",
        }}
      >
        {administrationSettingsTabs.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Link
              key={tab.key}
              role="tab"
              aria-selected={active}
              href={`/administration/settings?tab=${tab.key}`}
              title={tab.description}
              style={{
                flex: "0 0 auto",
                minHeight: 42,
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                padding: "0 16px",
                borderRadius: 11,
                textDecoration: "none",
                whiteSpace: "nowrap",
                fontSize: 13,
                fontWeight: active ? 700 : 600,
                color: active ? colors.text.inverse : colors.text.secondary,
                background: active ? colors.primary[600] : "transparent",
                boxShadow: active ? "0 6px 14px rgba(15, 139, 141, 0.18)" : "none",
                transition: "all 0.15s ease",
              }}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

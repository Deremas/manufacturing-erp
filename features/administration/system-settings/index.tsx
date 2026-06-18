"use client";

import React, { useState } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const containerStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
};

const formGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "8px 12px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.surface,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  outline: "none",
  boxSizing: "border-box",
  lineHeight: "20px",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "auto",
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const switchRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  padding: "8px 0",
  borderBottom: `1px solid ${colors.border}`,
};

const switchLabelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
};

const toggleStyle: React.CSSProperties = {
  width: "36px",
  height: "20px",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  position: "relative",
  transition: "background-color 0.2s",
  flexShrink: 0,
};

const toggleThumbStyle = (on: boolean): React.CSSProperties => ({
  width: "16px",
  height: "16px",
  borderRadius: "50%",
  backgroundColor: colors.surface,
  position: "absolute",
  top: "2px",
  left: on ? "18px" : "2px",
  transition: "left 0.2s",
  boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
});

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function SystemSettingsPage() {
  const [dateFormat, setDateFormat] = useState("YYYY-MM-DD");
  const [timezone, setTimezone] = useState("Africa/Nairobi");
  const [currency, setCurrency] = useState("ETB");
  const [vatPercentage, setVatPercentage] = useState("15");
  const [excisePercentage, setExcisePercentage] = useState("0");
  const [lowStockThreshold, setLowStockThreshold] = useState("10");
  const [negativeStockAllowed, setNegativeStockAllowed] = useState(false);
  const [approvalSettings, setApprovalSettings] = useState<
    Record<string, boolean>
  >({
    procurement: true,
    inventory: false,
    production: true,
    sales: true,
    finance: true,
    hr: true,
    reports: false,
  });

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "System Settings" },
  ];

  const handleSave = () => {
    console.log("Save system settings", {
      dateFormat,
      timezone,
      currency,
      vatPercentage,
      excisePercentage,
      lowStockThreshold,
      negativeStockAllowed,
      approvalSettings,
    });
  };

  const handleCancel = () => {
    console.log("Cancel system settings");
  };

  const toggleApproval = (module: string) => {
    setApprovalSettings((prev) => ({
      ...prev,
      [module]: !prev[module],
    }));
  };

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      onClick: handleCancel,
    },
    {
      label: "Save",
      variant: "primary",
      onClick: handleSave,
    },
  ];

  const moduleLabels: Record<string, string> = {
    procurement: "Procurement",
    inventory: "Inventory",
    production: "Production",
    sales: "Sales",
    finance: "Finance",
    hr: "Human Resources",
    reports: "Reports",
  };

  return (
    <div style={containerStyle}>
      <PageHeader title="System Settings" breadcrumbs={breadcrumbs} />

      <FormCard
        title="General"
        variant="teal-header"
        footer={{
          actions: <ActionButtons actions={footerActions} />,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Date Format</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                style={selectStyle}
              >
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD-MMM-YYYY">DD-MMM-YYYY</option>
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Timezone</label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                style={selectStyle}
              >
                <option value="Africa/Nairobi">Africa/Nairobi (UTC+3)</option>
                <option value="Africa/Addis_Ababa">
                  Africa/Addis_Ababa (UTC+3)
                </option>
                <option value="UTC">UTC</option>
                <option value="America/New_York">
                  America/New_York (UTC-5)
                </option>
                <option value="Europe/London">Europe/London (UTC+0)</option>
                <option value="Asia/Dubai">Asia/Dubai (UTC+4)</option>
              </select>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={selectStyle}
              >
                <option value="ETB">ETB — Ethiopian Birr</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
              </select>
            </div>
            <div style={formGroupStyle} />
          </div>
        </div>
      </FormCard>

      <FormCard title="Tax Settings" variant="teal-header">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>VAT Percentage (%)</label>
              <input
                type="number"
                value={vatPercentage}
                onChange={(e) => setVatPercentage(e.target.value)}
                style={inputStyle}
                min="0"
                max="100"
                step="0.5"
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Excise Percentage (%)</label>
              <input
                type="number"
                value={excisePercentage}
                onChange={(e) => setExcisePercentage(e.target.value)}
                style={inputStyle}
                min="0"
                max="100"
                step="0.5"
              />
            </div>
          </div>
        </div>
      </FormCard>

      <FormCard title="Stock Rules" variant="teal-header">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Low Stock Threshold</label>
              <input
                type="number"
                value={lowStockThreshold}
                onChange={(e) => setLowStockThreshold(e.target.value)}
                style={inputStyle}
                min="0"
                placeholder="Enter threshold quantity"
              />
            </div>
            <div style={formGroupStyle} />
          </div>
          <div style={switchRowStyle}>
            <span style={switchLabelStyle}>Allow Negative Stock</span>
            <button
              style={{
                ...toggleStyle,
                backgroundColor: negativeStockAllowed
                  ? colors.primary[600]
                  : colors.secondary[300],
              }}
              onClick={() => setNegativeStockAllowed(!negativeStockAllowed)}
            >
              <div style={toggleThumbStyle(negativeStockAllowed)} />
            </button>
          </div>
        </div>
      </FormCard>

      <FormCard title="Approval" variant="teal-header">
        <div style={{ display: "flex", flexDirection: "column" }}>
          {Object.entries(moduleLabels).map(([key, label]) => (
            <div key={key} style={switchRowStyle}>
              <span style={switchLabelStyle}>{label}</span>
              <button
                style={{
                  ...toggleStyle,
                  backgroundColor: approvalSettings[key]
                    ? colors.primary[600]
                    : colors.secondary[300],
                }}
                onClick={() => toggleApproval(key)}
              >
                <div style={toggleThumbStyle(approvalSettings[key] ?? false)} />
              </button>
            </div>
          ))}
        </div>
      </FormCard>
    </div>
  );
}

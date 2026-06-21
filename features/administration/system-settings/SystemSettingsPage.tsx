"use client";

import React, { useState } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import {
  Settings,
  Package,
  CreditCard,
  Save,
  X,
  ToggleLeft,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const pageStyle: React.CSSProperties = {
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
  padding: "10px 12px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.surface,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  outline: "none",
  boxSizing: "border-box",
  lineHeight: "20px",
  height: "48px",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "auto",
  height: "48px",
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
};

const row3Style: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr 1fr",
  gap: "16px",
};

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  paddingTop: "4px",
};

const stickyFooterStyle: React.CSSProperties = {
  position: "sticky",
  bottom: 0,
  zIndex: 10,
  backgroundColor: "#f8fafc",
  borderTop: `1px solid ${colors.border}`,
  padding: "16px 40px",
  display: "flex",
  justifyContent: "flex-end",
  gap: "8px",
};

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function SystemSettingsPage() {
  const [defaultCurrency, setDefaultCurrency] = useState("ETB");
  const [timezone, setTimezone] = useState("Africa/Nairobi");
  const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
  const [numberFormat, setNumberFormat] = useState("1,234.56");
  const [defaultLanguage, setDefaultLanguage] = useState("English");
  const [allowNegativeStock, setAllowNegativeStock] = useState(false);
  const [defaultValuation, setDefaultValuation] = useState("FIFO");
  const [requireTransferApproval, setRequireTransferApproval] = useState(true);
  const [defaultBankAccount, setDefaultBankAccount] = useState("");
  const [defaultCashLocation, setDefaultCashLocation] = useState("");
  const [vatEnabled, setVatEnabled] = useState(true);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "System Settings" },
  ];

  const handleSave = () => console.log("Save system settings");
  const handleCancel = () => console.log("Cancel");

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: handleCancel,
    },
    {
      label: "Save",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: handleSave,
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader title="System Settings" breadcrumbs={breadcrumbs} />

      <FormCard
        title="General Settings"
        icon={<Settings size={18} />}
        variant="teal-header"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={row3Style}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Currency</label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                style={selectStyle}
              >
                <option value="ETB">ETB - Ethiopian Birr</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
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
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Date Format</label>
              <select
                value={dateFormat}
                onChange={(e) => setDateFormat(e.target.value)}
                style={selectStyle}
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Number Format</label>
              <select
                value={numberFormat}
                onChange={(e) => setNumberFormat(e.target.value)}
                style={selectStyle}
              >
                <option value="1,234.56">1,234.56</option>
                <option value="1.234,56">1.234,56</option>
                <option value="1 234.56">1 234.56</option>
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Language</label>
              <select
                value={defaultLanguage}
                onChange={(e) => setDefaultLanguage(e.target.value)}
                style={selectStyle}
              >
                <option value="English">English</option>
                <option value="Amharic">Amharic</option>
              </select>
            </div>
          </div>
        </div>
      </FormCard>

      <FormCard title="Inventory Settings" icon={<Package size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={allowNegativeStock}
              onChange={(e) => setAllowNegativeStock(e.target.checked)}
              style={{
                width: "18px",
                height: "18px",
                accentColor: colors.primary[600],
              }}
            />
            <span
              style={{
                fontFamily: typography.fontFamily,
                fontSize: typography.sizes.body.fontSize,
                color: colors.text.primary,
              }}
            >
              Allow Negative Stock
            </span>
          </div>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Valuation Method</label>
              <select
                value={defaultValuation}
                onChange={(e) => setDefaultValuation(e.target.value)}
                style={selectStyle}
              >
                <option value="FIFO">FIFO - First In First Out</option>
                <option value="LIFO">LIFO - Last In First Out</option>
                <option value="AVG">Average Cost</option>
              </select>
            </div>
            <div style={{ ...formGroupStyle, justifyContent: "flex-end" }}>
              <div style={toggleRowStyle}>
                <input
                  type="checkbox"
                  checked={requireTransferApproval}
                  onChange={(e) => setRequireTransferApproval(e.target.checked)}
                  style={{
                    width: "18px",
                    height: "18px",
                    accentColor: colors.primary[600],
                  }}
                />
                <span
                  style={{
                    fontFamily: typography.fontFamily,
                    fontSize: typography.sizes.body.fontSize,
                    color: colors.text.primary,
                  }}
                >
                  Require Transfer Approval
                </span>
              </div>
            </div>
          </div>
        </div>
      </FormCard>

      <FormCard title="Sales/Finance Settings" icon={<CreditCard size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Bank Account</label>
              <select
                value={defaultBankAccount}
                onChange={(e) => setDefaultBankAccount(e.target.value)}
                style={selectStyle}
              >
                <option value="">Select Bank Account</option>
                <option value="CBE-001">Commercial Bank - 1000134567</option>
                <option value="DB-001">Dashen Bank - 0123456789</option>
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Cash Location</label>
              <select
                value={defaultCashLocation}
                onChange={(e) => setDefaultCashLocation(e.target.value)}
                style={selectStyle}
              >
                <option value="">Select Location</option>
                <option value="main-cash">Main Cash Register</option>
                <option value="petty-cash">Petty Cash</option>
              </select>
            </div>
          </div>
          <div style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={vatEnabled}
              onChange={(e) => setVatEnabled(e.target.checked)}
              style={{
                width: "18px",
                height: "18px",
                accentColor: colors.primary[600],
              }}
            />
            <span
              style={{
                fontFamily: typography.fontFamily,
                fontSize: typography.sizes.body.fontSize,
                color: colors.text.primary,
              }}
            >
              VAT Enabled
            </span>
          </div>
        </div>
      </FormCard>

      <div style={stickyFooterStyle}>
        <ActionButtons actions={footerActions} />
      </div>
    </div>
  );
}

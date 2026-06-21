"use client";

import React, { useState } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { Building2, Printer, DollarSign, Save, X, Upload } from "lucide-react";

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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: "80px",
  resize: "vertical",
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: "16px",
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

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  paddingTop: "4px",
};

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function CompanySettingsPage() {
  const [companyName, setCompanyName] = useState("New Manufacturing PLC");
  const [tradeName, setTradeName] = useState("New Mfg");
  const [tin, setTin] = useState("TIN-0012345678");
  const [vatNumber, setVatNumber] = useState("VAT-8765432100");
  const [address, setAddress] = useState(
    "Bole Subcity, Woreda 03\nAddis Ababa, Ethiopia",
  );
  const [phone, setPhone] = useState("+251-11-555-0100");
  const [email, setEmail] = useState("info@newmanufacturing.com");
  const [website, setWebsite] = useState("www.newmanufacturing.com");
  const [printLogo, setPrintLogo] = useState(true);
  const [printCompanyName, setPrintCompanyName] = useState(true);
  const [footerText, setFooterText] = useState("Thank you for your business!");
  const [signatureLabel, setSignatureLabel] = useState("Authorized Signature");
  const [currency, setCurrency] = useState("ETB");
  const [fiscalYearStart, setFiscalYearStart] = useState("2026-07-01");
  const [defaultTaxCode, setDefaultTaxCode] = useState("VAT-15");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Company Settings" },
  ];

  const handleSave = () => console.log("Save company settings");
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
      <PageHeader title="Company Settings" breadcrumbs={breadcrumbs} />

      <FormCard
        title="Company Profile"
        icon={<Building2 size={18} />}
        variant="teal-header"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Company Name</label>
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Trade Name</label>
              <input
                type="text"
                value={tradeName}
                onChange={(e) => setTradeName(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>TIN</label>
              <input
                type="text"
                value={tin}
                onChange={(e) => setTin(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>VAT Number</label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Company Logo</label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: radius.scale.sm,
                  backgroundColor: colors.secondary[100],
                  border: `1px solid ${colors.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: colors.text.muted,
                  fontSize: "20px",
                  fontWeight: 600,
                }}
              >
                K
              </div>
              <button
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.components.button,
                  backgroundColor: colors.surface,
                  color: colors.text.primary,
                  cursor: "pointer",
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.body.fontSize,
                }}
              >
                <Upload size={16} /> Upload Logo
              </button>
            </div>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={textareaStyle}
              rows={3}
            />
          </div>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Website</label>
            <input
              type="text"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </FormCard>

      <FormCard title="Print Settings" icon={<Printer size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={printLogo}
              onChange={(e) => setPrintLogo(e.target.checked)}
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
              Print Logo on documents
            </span>
          </div>
          <div style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={printCompanyName}
              onChange={(e) => setPrintCompanyName(e.target.checked)}
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
              Print Company Name on documents
            </span>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Footer Text</label>
            <textarea
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              style={textareaStyle}
              rows={2}
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Signature Label</label>
            <input
              type="text"
              value={signatureLabel}
              onChange={(e) => setSignatureLabel(e.target.value)}
              style={inputStyle}
            />
          </div>
        </div>
      </FormCard>

      <FormCard title="Fiscal Settings" icon={<DollarSign size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={selectStyle}
              >
                <option value="ETB">ETB - Ethiopian Birr</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Fiscal Year Start</label>
              <input
                type="date"
                value={fiscalYearStart}
                onChange={(e) => setFiscalYearStart(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Default Tax Code</label>
            <select
              value={defaultTaxCode}
              onChange={(e) => setDefaultTaxCode(e.target.value)}
              style={selectStyle}
            >
              <option value="VAT-15">VAT 15%</option>
              <option value="VAT-0">VAT 0%</option>
              <option value="EXEMPT">Tax Exempt</option>
            </select>
          </div>
        </div>
      </FormCard>

      <div style={stickyFooterStyle}>
        <ActionButtons actions={footerActions} />
      </div>
    </div>
  );
}

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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "80px",
  resize: "vertical",
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

const fullRowStyle: React.CSSProperties = {
  gridColumn: "1 / -1",
};

const fileInputWrapperStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "12px",
};

const fileInputStyle: React.CSSProperties = {
  ...inputStyle,
  padding: "6px 12px",
  cursor: "pointer",
};

const logoPreviewStyle: React.CSSProperties = {
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
  flexShrink: 0,
};

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function CompanySettingsPage() {
  const [companyName, setCompanyName] = useState("KONEL Manufacturing PLC");
  const [address, setAddress] = useState(
    "Bole Subcity, Woreda 03\nAddis Ababa, Ethiopia",
  );
  const [phone, setPhone] = useState("+251-11-555-0100");
  const [email, setEmail] = useState("info@konelmanufacturing.com");
  const [tinNumber, setTinNumber] = useState("TIN-0012345678");
  const [vatNumber, setVatNumber] = useState("VAT-8765432100");
  const [defaultCurrency, setDefaultCurrency] = useState("ETB");
  const [fiscalYearStart, setFiscalYearStart] = useState("2026-07-01");
  const [invoiceFooter, setInvoiceFooter] = useState(
    "Thank you for your business! Payment is due within 30 days.",
  );
  const [reportHeaderInfo, setReportHeaderInfo] = useState(
    "KONEL Manufacturing PLC | Bole Subcity, Addis Ababa | Tel: +251-11-555-0100",
  );

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Company Settings" },
  ];

  const handleSave = () => {
    console.log("Save company settings", {
      companyName,
      address,
      phone,
      email,
      tinNumber,
      vatNumber,
      defaultCurrency,
      fiscalYearStart,
      invoiceFooter,
      reportHeaderInfo,
    });
  };

  const handleCancel = () => {
    console.log("Cancel company settings");
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

  return (
    <div style={containerStyle}>
      <PageHeader title="Company Settings" breadcrumbs={breadcrumbs} />

      <FormCard
        title="Company Information"
        variant="teal-header"
        footer={{
          actions: <ActionButtons actions={footerActions} />,
        }}
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
                placeholder="Enter company name"
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Company Logo</label>
              <div style={fileInputWrapperStyle}>
                <div style={logoPreviewStyle}>K</div>
                <input
                  type="file"
                  accept="image/*"
                  style={fileInputStyle}
                  title="Upload logo"
                />
              </div>
            </div>
          </div>

          <div style={formGroupStyle}>
            <label style={labelStyle}>Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={textareaStyle}
              placeholder="Enter company address"
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
                placeholder="Enter phone number"
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="Enter email address"
              />
            </div>
          </div>

          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>TIN Number</label>
              <input
                type="text"
                value={tinNumber}
                onChange={(e) => setTinNumber(e.target.value)}
                style={inputStyle}
                placeholder="Enter TIN number"
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>VAT Number</label>
              <input
                type="text"
                value={vatNumber}
                onChange={(e) => setVatNumber(e.target.value)}
                style={inputStyle}
                placeholder="Enter VAT number"
              />
            </div>
          </div>
        </div>
      </FormCard>

      <FormCard title="Financial Settings" variant="teal-header">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Currency</label>
              <select
                value={defaultCurrency}
                onChange={(e) => setDefaultCurrency(e.target.value)}
                style={selectStyle}
              >
                <option value="ETB">ETB — Ethiopian Birr</option>
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
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
        </div>
      </FormCard>

      <FormCard title="Document Settings" variant="teal-header">
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Invoice Footer Text</label>
            <textarea
              value={invoiceFooter}
              onChange={(e) => setInvoiceFooter(e.target.value)}
              style={textareaStyle}
              placeholder="Enter invoice footer text"
              rows={3}
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Report Header Info</label>
            <textarea
              value={reportHeaderInfo}
              onChange={(e) => setReportHeaderInfo(e.target.value)}
              style={textareaStyle}
              placeholder="Enter report header information"
              rows={3}
            />
          </div>
        </div>
      </FormCard>
    </div>
  );
}

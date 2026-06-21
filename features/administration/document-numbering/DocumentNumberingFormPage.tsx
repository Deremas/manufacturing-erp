"use client";

import React, { useState } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { FileDigit, Save, X } from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface DocNumberingFormPageProps {
  isCreating?: boolean;
}

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

const previewStyle: React.CSSProperties = {
  padding: "12px 16px",
  backgroundColor: colors.primary[50],
  border: `1px solid ${colors.primary[200]}`,
  borderRadius: radius.scale.md,
  fontFamily: "monospace",
  fontSize: typography.sizes.body.fontSize,
  color: colors.primary[700],
  fontWeight: typography.weights.semibold,
  textAlign: "center",
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
export default function DocumentNumberingFormPage({
  isCreating = true,
}: DocNumberingFormPageProps) {
  const [module, setModule] = useState("Procurement");
  const [documentType, setDocumentType] = useState("");
  const [prefix, setPrefix] = useState("");
  const [suffix, setSuffix] = useState("");
  const [currentNumber, setCurrentNumber] = useState("1");
  const [padding, setPadding] = useState("5");
  const [resetRule, setResetRule] = useState("Never");
  const [includeYear, setIncludeYear] = useState(true);
  const [includeMonth, setIncludeMonth] = useState(false);
  const [includeLocation, setIncludeLocation] = useState(false);
  const [status, setStatus] = useState("active");

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Document Numbering", href: "/administration/document-numbering" },
    { label: isCreating ? "Create Configuration" : "Edit Configuration" },
  ];

  const generatePreview = () => {
    let p = prefix;
    if (includeYear) p += "-2026";
    if (includeMonth) p += "-06";
    if (includeLocation) p += "-MN";
    p += `-${currentNumber.padStart(Number(padding), "0")}`;
    if (suffix) p += `-${suffix}`;
    return p;
  };

  const handleSave = () => console.log("Save");
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
      <PageHeader
        title={
          isCreating ? "Create Document Numbering" : "Edit Document Numbering"
        }
        breadcrumbs={breadcrumbs}
      />

      <FormCard title="Configuration" icon={<FileDigit size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Module</label>
              <select
                value={module}
                onChange={(e) => setModule(e.target.value)}
                style={selectStyle}
              >
                <option value="Procurement">Procurement</option>
                <option value="Inventory">Inventory</option>
                <option value="Production">Production</option>
                <option value="Sales">Sales</option>
                <option value="Finance">Finance</option>
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Document Type</label>
              <input
                type="text"
                value={documentType}
                onChange={(e) => setDocumentType(e.target.value)}
                style={inputStyle}
                placeholder="e.g. Purchase Order"
              />
            </div>
          </div>
          <div style={row3Style}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Prefix</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                style={inputStyle}
                placeholder="e.g. PO"
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Suffix</label>
              <input
                type="text"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                style={inputStyle}
                placeholder="Optional"
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Padding</label>
              <select
                value={padding}
                onChange={(e) => setPadding(e.target.value)}
                style={selectStyle}
              >
                <option value="3">3</option>
                <option value="4">4</option>
                <option value="5">5</option>
                <option value="6">6</option>
              </select>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Current Number</label>
              <input
                type="number"
                value={currentNumber}
                onChange={(e) => setCurrentNumber(e.target.value)}
                style={inputStyle}
                min="1"
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Reset Rule</label>
              <select
                value={resetRule}
                onChange={(e) => setResetRule(e.target.value)}
                style={selectStyle}
              >
                <option value="Never">Never</option>
                <option value="Daily">Daily</option>
                <option value="Monthly">Monthly</option>
                <option value="Yearly">Yearly</option>
              </select>
            </div>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={selectStyle}
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
        </div>
      </FormCard>

      <FormCard title="Increments" icon={<FileDigit size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <div style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={includeYear}
              onChange={(e) => setIncludeYear(e.target.checked)}
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
              Include Year
            </span>
          </div>
          <div style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={includeMonth}
              onChange={(e) => setIncludeMonth(e.target.checked)}
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
              Include Month
            </span>
          </div>
          <div style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={includeLocation}
              onChange={(e) => setIncludeLocation(e.target.checked)}
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
              Include Location Code
            </span>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Preview</label>
            <div style={previewStyle}>{generatePreview()}</div>
          </div>
        </div>
      </FormCard>

      <div style={stickyFooterStyle}>
        <ActionButtons actions={footerActions} />
      </div>
    </div>
  );
}

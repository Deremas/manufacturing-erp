"use client";

import React, { useState, useEffect } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { TaxCode } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { Save, X, Receipt } from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface TaxCodeFormPageProps {
  initialData?: TaxCode;
  taxTypes?: string[];
  onSubmit?: (data: Partial<TaxCode>) => Promise<void>;
  loading?: boolean;
  isEdit?: boolean;
  onBack?: () => void;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
};

const gridStyle2: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, 1fr)",
  gap: "16px",
};

const fieldGroupStyle: React.CSSProperties = {
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
  height: "48px",
  padding: "10px 12px",
  border: `1px solid ${colors.border}`,
  borderRadius: "10px",
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

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "8px",
  paddingTop: "4px",
};

const toggleLabelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
};

const checkboxStyle: React.CSSProperties = {
  width: "18px",
  height: "18px",
  cursor: "pointer",
  accentColor: colors.primary[600],
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
  marginBottom: "16px",
  paddingBottom: "8px",
  borderBottom: `1px solid ${colors.border}`,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "24px",
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
// Component
// ----------------------------------------------------------------------------
export default function TaxCodeFormPage({
  initialData,
  taxTypes = [],
  onSubmit,
  loading,
  isEdit: editMode,
  onBack,
}: TaxCodeFormPageProps) {
  const isEdit = editMode ?? !!initialData;
  const taxTypeOptions = taxTypes;

  const [taxName, setTaxName] = useState("");
  const [taxType, setTaxType] = useState("");
  const [rate, setRate] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialData) {
      setTaxName(initialData.taxName);
      setTaxType(initialData.taxType);
      setRate(initialData.rate);
      setIsActive(initialData.isActive ?? true);
    }
  }, [initialData]);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Tax Codes", href: "/master-data/tax-codes" },
    { label: isEdit ? "Edit Tax Code" : "Create Tax Code" },
  ];

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit({
        taxName,
        taxType,
        rate,
        isActive,
      });
    }
  };

  const handleCancel = () => {
    if (onBack) {
      onBack();
    } else {
      window.history.back();
    }
  };

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: handleCancel,
      disabled: loading,
    },
    {
      label: isEdit ? "Update Tax Code" : "Save Tax Code",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: handleSubmit,
      loading,
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title={isEdit ? "Edit Tax Code" : "Create Tax Code"}
        breadcrumbs={breadcrumbs}
      />

      <FormCard
        title="Tax Code Information"
        variant="teal-header"
        icon={<Receipt size={18} />}
      >
        {/* Details Section */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Tax Details</h4>
          <div style={gridStyle2}>
            {/* Name */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={taxName}
                onChange={(e) => setTaxName(e.target.value)}
                style={inputStyle}
                placeholder="e.g. VAT 16%"
              />
            </div>

            {/* Type */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Type</label>
              <select
                value={taxType}
                onChange={(e) => setTaxType(e.target.value)}
                style={selectStyle}
              >
                <option value="">Select type...</option>
                {taxTypeOptions.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div style={gridStyle2}>
            {/* Rate */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Rate (%)</label>
              <input
                type="number"
                value={rate}
                onChange={(e) => setRate(Number(e.target.value))}
                style={inputStyle}
                placeholder="e.g. 16"
                min={0}
                step={0.01}
              />
            </div>

            {/* Status */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Status</label>
              <div style={toggleRowStyle}>
                <input
                  type="checkbox"
                  style={checkboxStyle}
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                />
                <span style={toggleLabelStyle}>
                  {isActive ? "Active" : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>
      </FormCard>

      <div style={stickyFooterStyle}>
        <ActionButtons actions={footerActions} />
      </div>
    </div>
  );
}

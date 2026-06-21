"use client";

import React, { useState, useEffect } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { Unit } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { Save, X, Ruler } from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface UnitFormPageProps {
  initialData?: Unit;
  onSubmit?: (data: Partial<Unit>) => Promise<void>;
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
export default function UnitFormPage({
  initialData,
  onSubmit,
  loading,
  isEdit: editMode,
  onBack,
}: UnitFormPageProps) {
  const isEdit = editMode ?? !!initialData;

  const [name, setName] = useState("");
  const [abbreviation, setAbbreviation] = useState("");
  const [type, setType] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialData) {
      setName(initialData.name);
      setAbbreviation(initialData.abbreviation);
      setType(initialData.type);
      setIsActive(initialData.isActive ?? true);
    }
  }, [initialData]);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Units of Measure", href: "/master-data/units" },
    { label: isEdit ? "Edit Unit" : "Create Unit" },
  ];

  const handleSubmit = async () => {
    // TODO: Add validation before submit
    if (onSubmit) {
      await onSubmit({ name, abbreviation, type, isActive });
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
      label: isEdit ? "Update Unit" : "Save Unit",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: handleSubmit,
      loading,
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title={isEdit ? "Edit Unit" : "Create Unit"}
        breadcrumbs={breadcrumbs}
      />

      <FormCard
        title="Unit Information"
        variant="teal-header"
        icon={<Ruler size={18} />}
      >
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Unit Details</h4>
          <div style={gridStyle2}>
            {/* Name */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                placeholder="e.g. Kilogram"
              />
            </div>

            {/* Abbreviation */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Abbreviation</label>
              <input
                type="text"
                value={abbreviation}
                onChange={(e) => setAbbreviation(e.target.value)}
                style={inputStyle}
                placeholder="e.g. kg"
              />
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Classification</h4>
          <div style={gridStyle2}>
            {/* Type */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Type</label>
              <input
                type="text"
                value={type}
                onChange={(e) => setType(e.target.value)}
                style={inputStyle}
                placeholder="e.g. Weight"
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

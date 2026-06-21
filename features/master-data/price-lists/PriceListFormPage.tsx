"use client";

import React, { useState, useEffect } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { PriceList } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { Save, X, BadgeDollarSign } from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface PriceListFormPageProps {
  initialData?: PriceList;
  onSubmit?: (data: Partial<PriceList>) => Promise<void>;
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
export default function PriceListFormPage({
  initialData,
  onSubmit,
  loading,
  isEdit: editMode,
  onBack,
}: PriceListFormPageProps) {
  const isEdit = editMode ?? !!initialData;

  const [itemId, setItemId] = useState("");
  const [customerGroup, setCustomerGroup] = useState("Retail");
  const [price, setPrice] = useState(0);
  const [effectiveDate, setEffectiveDate] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialData) {
      setItemId(initialData.itemId ?? "");
      setCustomerGroup(initialData.customerGroup ?? "Retail");
      setPrice(initialData.price ?? 0);
      setEffectiveDate(initialData.effectiveDate ?? "");
      setIsActive(initialData.isActive ?? true);
    }
  }, [initialData]);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Price Lists", href: "/master-data/price-lists" },
    { label: isEdit ? "Edit Price List" : "Create Price List" },
  ];

  const handleSubmit = async () => {
    if (onSubmit) {
      await onSubmit({
        itemId,
        customerGroup,
        price,
        effectiveDate,
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
      label: isEdit ? "Update Price List" : "Save Price List",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: handleSubmit,
      loading,
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title={isEdit ? "Edit Price List" : "Create Price List"}
        breadcrumbs={breadcrumbs}
      />

      <FormCard
        title="Price List Information"
        variant="teal-header"
        icon={<BadgeDollarSign size={18} />}
      >
        {/* Pricing Section */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Pricing Details</h4>
          <div style={gridStyle2}>
            {/* Item */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Item</label>
              <select
                value={itemId}
                onChange={(e) => setItemId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Select an item...</option>
                <option value="item-1">Premium Maize Flour - 2kg</option>
                <option value="item-2">Cooking Oil - 5L</option>
                <option value="item-3">Sugar - 1kg</option>
                <option value="item-4">Rice - 5kg</option>
                <option value="item-5">Wheat Flour - 10kg</option>
              </select>
            </div>

            {/* Customer Group */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Customer Group</label>
              <select
                value={customerGroup}
                onChange={(e) => setCustomerGroup(e.target.value)}
                style={selectStyle}
              >
                <option value="Retail">Retail</option>
                <option value="Wholesale">Wholesale</option>
                <option value="Distributor">Distributor</option>
                <option value="Export">Export</option>
              </select>
            </div>
          </div>

          <div style={gridStyle2}>
            {/* Price */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Price</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(Number(e.target.value))}
                style={inputStyle}
                placeholder="e.g. 350.00"
                min={0}
                step={0.01}
              />
            </div>

            {/* Effective Date */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Effective Date</label>
              <input
                type="date"
                value={effectiveDate}
                onChange={(e) => setEffectiveDate(e.target.value)}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={gridStyle2}>
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

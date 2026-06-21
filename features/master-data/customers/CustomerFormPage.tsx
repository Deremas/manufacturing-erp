"use client";

import React, { useState, useEffect } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { Customer } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { Save, X, Users, Truck } from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface CustomerFormPageProps {
  initialData?: Customer;
  onSubmit?: (data: Partial<Customer>) => Promise<void>;
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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  height: "auto",
  minHeight: "80px",
  resize: "vertical",
  lineHeight: "1.5",
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
export default function CustomerFormPage({
  initialData,
  onSubmit,
  loading,
  isEdit: editMode,
  onBack,
}: CustomerFormPageProps) {
  const isEdit = editMode ?? !!initialData;

  const [customerCode, setCustomerCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialData) {
      setCustomerCode(initialData.customerCode);
      setName(initialData.name);
      setPhone(initialData.phone ?? "");
      setEmail(initialData.email ?? "");
      setAddress(initialData.address ?? "");
      setCreditLimit(String(initialData.creditLimit));
      setPaymentTerms(initialData.paymentTerms ?? "Net 30");
      setIsActive(initialData.isActive ?? true);
    }
  }, [initialData]);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Customers", href: "/master-data/customers" },
    { label: isEdit ? "Edit Customer" : "Create Customer" },
  ];

  const handleSubmit = async () => {
    // TODO: Add validation before submit
    if (onSubmit) {
      await onSubmit({
        customerCode,
        name,
        phone,
        email,
        address,
        creditLimit: Number(creditLimit) || 0,
        paymentTerms,
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
      label: isEdit ? "Update Customer" : "Save Customer",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: handleSubmit,
      loading,
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title={isEdit ? "Edit Customer" : "Create Customer"}
        breadcrumbs={breadcrumbs}
      />

      <FormCard
        title="Basic Information"
        variant="teal-header"
        icon={<Users size={18} />}
      >
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Contact Details</h4>
          <div style={gridStyle2}>
            {/* Customer Code */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Customer Code</label>
              <input
                type="text"
                value={customerCode}
                onChange={(e) => setCustomerCode(e.target.value)}
                style={inputStyle}
                placeholder="e.g. CUST-001"
              />
            </div>

            {/* Name */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Customer Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={inputStyle}
                placeholder="e.g. ABC Trading PLC"
              />
            </div>
          </div>

          <div style={gridStyle2}>
            {/* Phone */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Phone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                style={inputStyle}
                placeholder="e.g. +251-11-555-0101"
              />
            </div>

            {/* Email */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
                placeholder="e.g. info@company.com"
              />
            </div>
          </div>
        </div>
      </FormCard>

      <FormCard
        title="Address & Terms"
        variant="teal-header"
        icon={<Truck size={18} />}
      >
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Location</h4>
          <div style={fieldGroupStyle}>
            <label style={labelStyle}>Address</label>
            <textarea
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              style={textareaStyle}
              placeholder="Enter full address"
            />
          </div>
        </div>

        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Financial Terms</h4>
          <div style={gridStyle2}>
            {/* Credit Limit */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Credit Limit (ETB)</label>
              <input
                type="number"
                value={creditLimit}
                onChange={(e) => setCreditLimit(e.target.value)}
                style={inputStyle}
                placeholder="e.g. 500000"
                min={0}
              />
            </div>

            {/* Payment Terms */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Payment Terms</label>
              <input
                type="text"
                value={paymentTerms}
                onChange={(e) => setPaymentTerms(e.target.value)}
                style={inputStyle}
                placeholder="e.g. Net 30"
              />
            </div>
          </div>
        </div>

        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Status</h4>
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
      </FormCard>

      <div style={stickyFooterStyle}>
        <ActionButtons actions={footerActions} />
      </div>
    </div>
  );
}

"use client";

import React, { useState, useEffect } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { Bank } from "../types";
import type { BankAccount } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { Save, X, CreditCard } from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface BankAccountFormPageProps {
  initialData?: BankAccount;
  banks?: Bank[];
  onSubmit?: (data: Partial<BankAccount>) => Promise<void>;
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
export default function BankAccountFormPage({
  initialData,
  banks = [],
  onSubmit,
  loading,
  isEdit: editMode,
  onBack,
}: BankAccountFormPageProps) {
  const isEdit = editMode ?? !!initialData;
  const bankOptions = banks;

  const [accountCode, setAccountCode] = useState("");
  const [accountName, setAccountName] = useState("");
  const [bankId, setBankId] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [branch, setBranch] = useState("");
  const [currency, setCurrency] = useState("");
  const [openingBalance, setOpeningBalance] = useState(0);
  const [swiftCode, setSwiftCode] = useState("");
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (initialData) {
      setAccountCode(initialData.accountCode);
      setAccountName(initialData.accountName);
      setBankId(initialData.bankId);
      setAccountNumber(initialData.accountNumber);
      setBranch(initialData.branch ?? "");
      setCurrency(initialData.currency);
      setOpeningBalance(initialData.openingBalance);
      setSwiftCode(initialData.swiftCode ?? "");
      setIsActive(initialData.isActive ?? true);
    }
  }, [initialData]);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Bank Accounts", href: "/master-data/bank-accounts" },
    { label: isEdit ? "Edit Bank Account" : "Create Bank Account" },
  ];

  const handleSubmit = async () => {
    // TODO: Add validation before submit
    if (onSubmit) {
      await onSubmit({
        accountCode,
        accountName,
        bankId,
        accountNumber,
        branch,
        currency,
        openingBalance,
        swiftCode,
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
      label: isEdit ? "Update Bank Account" : "Save Bank Account",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: handleSubmit,
      loading,
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title={isEdit ? "Edit Bank Account" : "Create Bank Account"}
        breadcrumbs={breadcrumbs}
      />

      <FormCard
        title="Account Information"
        variant="teal-header"
        icon={<CreditCard size={18} />}
      >
        {/* Account Details */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Account Details</h4>
          <div style={gridStyle2}>
            {/* Code */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Code</label>
              <input
                type="text"
                value={accountCode}
                onChange={(e) => setAccountCode(e.target.value)}
                style={inputStyle}
                placeholder="e.g. BA-001"
              />
            </div>

            {/* Account Name */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Account Name</label>
              <input
                type="text"
                value={accountName}
                onChange={(e) => setAccountName(e.target.value)}
                style={inputStyle}
                placeholder="e.g. Operating Account"
              />
            </div>
          </div>

          <div style={gridStyle2}>
            {/* Bank */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Bank</label>
              <select
                value={bankId}
                onChange={(e) => setBankId(e.target.value)}
                style={selectStyle}
              >
                <option value="">Select a bank...</option>
                {bankOptions.map((bank) => (
                  <option key={bank.id} value={bank.id}>
                    {bank.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Account Number */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                style={inputStyle}
                placeholder="e.g. 1234567890"
              />
            </div>
          </div>

          <div style={gridStyle2}>
            {/* Branch */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Branch</label>
              <input
                type="text"
                value={branch}
                onChange={(e) => setBranch(e.target.value)}
                style={inputStyle}
                placeholder="e.g. Downtown Branch"
              />
            </div>

            {/* SWIFT Code */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>SWIFT Code</label>
              <input
                type="text"
                value={swiftCode}
                onChange={(e) => setSwiftCode(e.target.value)}
                style={inputStyle}
                placeholder="e.g. FNBKUS12"
              />
            </div>
          </div>
        </div>

        {/* Financial */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Financial</h4>
          <div style={gridStyle2}>
            {/* Currency */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Currency</label>
              <input
                type="text"
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                style={selectStyle}
                placeholder="e.g. ETB"
              />
            </div>
          </div>

          <div style={gridStyle2}>
            {/* Opening Balance */}
            <div style={fieldGroupStyle}>
              <label style={labelStyle}>Opening Balance</label>
              <input
                type="number"
                value={openingBalance}
                onChange={(e) => setOpeningBalance(Number(e.target.value))}
                style={inputStyle}
                placeholder="e.g. 50000"
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

"use client";

import React from "react";
import { FormCard, ActionButtons } from "@/components/shared";
import type { Action } from "@/components/shared";
import type { BankAccount } from "../types";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface BankAccountDetailProps {
  bankAccount: BankAccount;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "16px",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const valueStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  lineHeight: "24px",
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.small.fontSize,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
  marginBottom: "12px",
  paddingBottom: "6px",
  borderBottom: `1px solid ${colors.border}`,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "20px",
};

const badgeActiveStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  padding: "2px 10px",
  borderRadius: "12px",
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  backgroundColor: colors.success[50],
  color: colors.success[700],
  border: `1px solid ${colors.success[200]}`,
};

const badgeInactiveStyle: React.CSSProperties = {
  ...badgeActiveStyle,
  backgroundColor: colors.secondary[50],
  color: colors.secondary[600],
  border: `1px solid ${colors.secondary[200]}`,
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function BankAccountDetail({
  bankAccount,
  onEdit,
  onDelete,
  onBack,
}: BankAccountDetailProps) {
  const actions: Action[] = [
    ...(onEdit
      ? [{ label: "Edit", variant: "primary" as const, onClick: onEdit }]
      : []),
    ...(onDelete
      ? [{ label: "Delete", variant: "danger" as const, onClick: onDelete }]
      : []),
    ...(onBack
      ? [{ label: "Back", variant: "secondary" as const, onClick: onBack }]
      : []),
  ];

  const statusBadge = bankAccount.isActive ? (
    <span style={badgeActiveStyle}>Active</span>
  ) : (
    <span style={badgeInactiveStyle}>Inactive</span>
  );

  const renderField = (label: string, value: React.ReactNode) => (
    <div style={fieldStyle}>
      <span style={labelStyle}>{label}</span>
      <span style={valueStyle}>{value ?? "\u2014"}</span>
    </div>
  );

  const formatCurrency = (val: number) =>
    `${bankAccount.currency || "ETB"} ${val.toLocaleString(undefined, { minimumFractionDigits: 2 })}`;

  return (
    <FormCard
      title="Bank Account Information"
      variant="teal-header"
      footer={{ actions: <ActionButtons actions={actions} /> }}
    >
      {/* Basic Info */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>Basic Information</h4>
        <div style={gridStyle}>
          {renderField("Account Code", bankAccount.accountCode)}
          {renderField("Account Name", bankAccount.accountName)}
          {renderField("Status", statusBadge)}
        </div>
      </div>

      {/* Bank Details */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>Bank Details</h4>
        <div style={gridStyle}>
          {renderField("Bank", bankAccount.bankName || bankAccount.bankId)}
          {renderField("Account Number", bankAccount.accountNumber)}
          {renderField("Branch", bankAccount.branch || "\u2014")}
          {renderField("Swift Code", bankAccount.swiftCode || "\u2014")}
          {renderField("Currency", bankAccount.currency || "ETB")}
        </div>
      </div>

      {/* Balances */}
      <div style={sectionStyle}>
        <h4 style={sectionTitleStyle}>Balances</h4>
        <div style={gridStyle}>
          {renderField(
            "Opening Balance",
            formatCurrency(bankAccount.openingBalance ?? 0),
          )}
          {renderField(
            "Current Balance",
            formatCurrency(bankAccount.currentBalance ?? 0),
          )}
        </div>
      </div>
    </FormCard>
  );
}

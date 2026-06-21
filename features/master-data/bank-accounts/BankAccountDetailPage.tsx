"use client";

import React from "react";
import {
  PageHeader,
  FormCard,
  ActionButtons,
  StatusBadge,
} from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import type { BankAccount } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import {
  Pencil,
  Trash2,
  ArrowLeft,
  CreditCard,
  Building2,
  DollarSign,
  Clock,
} from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface BankAccountDetailPageProps {
  bankAccount?: BankAccount;
  onEdit?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
  loading?: boolean;
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

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const fieldLabelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const fieldValueStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.regular,
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

const headerBannerStyle: React.CSSProperties = {
  backgroundColor: colors.primary[50],
  border: `1px solid ${colors.primary[200]}`,
  borderRadius: "16px",
  padding: "24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const headerInfoStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const headerNameStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.h3.fontSize,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
};

const headerSubStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
};

const balanceCardStyle: React.CSSProperties = {
  backgroundColor: colors.success[50],
  border: `1px solid ${colors.success[200]}`,
  borderRadius: "16px",
  padding: "20px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const balanceLabelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const balanceValueStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.h2.fontSize,
  fontWeight: typography.weights.bold,
  color: colors.success[700],
  margin: 0,
};

const timelineItemStyle: React.CSSProperties = {
  display: "flex",
  gap: "12px",
  paddingBottom: "12px",
  borderBottom: `1px solid ${colors.border}`,
};

const timelineDotStyle: React.CSSProperties = {
  width: "10px",
  height: "10px",
  borderRadius: "50%",
  backgroundColor: colors.primary[500],
  marginTop: "6px",
  flexShrink: 0,
};

const timelineContentStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "2px",
};

const timelineTitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.primary,
};

const timelineDateStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  color: colors.text.secondary,
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function BankAccountDetailPage({
  bankAccount,
  onEdit,
  onDelete,
  onBack,
  loading,
}: BankAccountDetailPageProps) {
  const currentBankAccount = bankAccount;

  if (!currentBankAccount) {
    return (
      <div style={{ padding: "24px" }}>
        <span
          style={{
            fontFamily: typography.fontFamily,
            color: colors.text.secondary,
          }}
        >
          Bank account not found
        </span>
      </div>
    );
  }

  const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currentBankAccount.currency,
      minimumFractionDigits: 2,
    }).format(value);
  };

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Bank Accounts", href: "/master-data/bank-accounts" },
    { label: currentBankAccount.accountName },
  ];

  const actions: Action[] = [
    ...(onBack
      ? [
          {
            label: "Back",
            variant: "secondary" as const,
            icon: <ArrowLeft size={16} />,
            onClick: onBack,
          },
        ]
      : []),
    ...(onEdit
      ? [
          {
            label: "Edit",
            variant: "primary" as const,
            icon: <Pencil size={16} />,
            onClick: onEdit,
          },
        ]
      : []),
    ...(onDelete
      ? [
          {
            label: "Delete",
            variant: "danger" as const,
            icon: <Trash2 size={16} />,
            onClick: onDelete,
          },
        ]
      : []),
  ];

  const renderField = (label: string, value: React.ReactNode) => (
    <div style={fieldStyle}>
      <span style={fieldLabelStyle}>{label}</span>
      <span style={fieldValueStyle}>{value ?? "\u2014"}</span>
    </div>
  );

  if (loading) {
    return (
      <div style={{ padding: "24px" }}>
        <span
          style={{
            fontFamily: typography.fontFamily,
            color: colors.text.secondary,
          }}
        >
          Loading bank account details...
        </span>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      <PageHeader
        title={currentBankAccount.accountName}
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      {/* Account Profile Header */}
      <div style={headerBannerStyle}>
        <div style={headerInfoStyle}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: radius.scale.md,
                backgroundColor: colors.primary[100],
                color: colors.primary[700],
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "24px",
              }}
            >
              <CreditCard size={24} />
            </div>
            <div>
              <h2 style={headerNameStyle}>{currentBankAccount.accountName}</h2>
              <span style={headerSubStyle}>
                {currentBankAccount.accountCode} &middot;{" "}
                {currentBankAccount.currency}
              </span>
            </div>
          </div>
        </div>
        <StatusBadge
          status={currentBankAccount.isActive ? "active" : "inactive"}
        />
      </div>

      {/* Current Balance Card */}
      <div style={balanceCardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: radius.scale.md,
              backgroundColor: colors.success[100],
              color: colors.success[700],
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <DollarSign size={24} />
          </div>
          <div>
            <span style={balanceLabelStyle}>Current Balance</span>
            <h3 style={balanceValueStyle}>
              {formatCurrency(currentBankAccount.currentBalance)}
            </h3>
          </div>
        </div>
        <div
          style={{
            textAlign: "right",
          }}
        >
          <span style={balanceLabelStyle}>Opening Balance</span>
          <div
            style={{
              fontFamily: typography.fontFamily,
              fontSize: typography.sizes.body.fontSize,
              fontWeight: typography.weights.medium,
              color: colors.text.primary,
            }}
          >
            {formatCurrency(currentBankAccount.openingBalance)}
          </div>
        </div>
      </div>

      {/* Bank Information Card */}
      <FormCard title="Bank Account Information" variant="teal-header">
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Building2 size={16} />
              <span>Bank Details</span>
            </div>
          </h4>
          <div style={gridStyle2}>
            {renderField("Bank Name", currentBankAccount.bankName)}
            {renderField("Branch", currentBankAccount.branch)}
            {renderField("Account Number", currentBankAccount.accountNumber)}
            {renderField("SWIFT Code", currentBankAccount.swiftCode)}
            {renderField("Currency", currentBankAccount.currency)}
            {renderField(
              "Status",
              currentBankAccount.isActive ? "Active" : "Inactive",
            )}
          </div>
        </div>
      </FormCard>

      {/* Activity Timeline */}
      <FormCard title="Activity" variant="teal-header">
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={timelineItemStyle}>
            <div style={timelineDotStyle} />
            <div style={timelineContentStyle}>
              <span style={timelineTitleStyle}>Bank Account Created</span>
              <span style={timelineDateStyle}>
                <Clock
                  size={12}
                  style={{ marginRight: "4px", verticalAlign: "middle" }}
                />
                Record created
              </span>
            </div>
          </div>
          <div style={timelineItemStyle}>
            <div style={timelineDotStyle} />
            <div style={timelineContentStyle}>
              <span style={timelineTitleStyle}>Last Updated</span>
              <span style={timelineDateStyle}>
                <Clock
                  size={12}
                  style={{ marginRight: "4px", verticalAlign: "middle" }}
                />
                Record modified
              </span>
            </div>
          </div>
        </div>
      </FormCard>
    </div>
  );
}

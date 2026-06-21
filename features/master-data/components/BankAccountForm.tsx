"use client";

import React, { useState, useEffect } from "react";
import { FormCard, ActionButtons } from "@/components/shared";
import type { Action } from "@/components/shared";
import { bankAccountSchema } from "@/validators/master-data";
import type { BankAccountInput } from "@/validators/master-data";
import type { BankAccount, Bank } from "../types";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface BankAccountFormProps {
  initialData?: BankAccount;
  banks?: Bank[];
  onSubmit?: (data: BankAccountInput) => Promise<void>;
  loading?: boolean;
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "16px",
};

const fieldGroupStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "4px",
};

const labelStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
  color: colors.text.secondary,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "7px 10px",
  border: `1px solid ${colors.border}`,
  borderRadius: "6px",
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

const errorTextStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  color: colors.danger[600],
  marginTop: "2px",
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
  marginBottom: "12px",
  paddingBottom: "6px",
  borderBottom: `1px solid ${colors.border}`,
};

const sectionStyle: React.CSSProperties = {
  marginBottom: "20px",
};

// ----------------------------------------------------------------------------
// Component
// ----------------------------------------------------------------------------
export default function BankAccountForm({
  initialData,
  banks = [],
  onSubmit,
  loading,
}: BankAccountFormProps) {
  const isEdit = !!initialData;

  const [form, setForm] = useState<BankAccountInput>({
    accountCode: "",
    accountName: "",
    bankId: "",
    accountNumber: "",
    branch: "",
    swiftCode: "",
    currency: "ETB",
    openingBalance: 0,
    currentBalance: 0,
    isActive: true,
  });

  const [errors, setErrors] = useState<Record<string, string[]>>({});

  useEffect(() => {
    if (initialData) {
      setForm({
        accountCode: initialData.accountCode,
        accountName: initialData.accountName,
        bankId: initialData.bankId,
        accountNumber: initialData.accountNumber,
        branch: initialData.branch ?? "",
        swiftCode: initialData.swiftCode ?? "",
        currency: initialData.currency ?? "ETB",
        openingBalance: initialData.openingBalance ?? 0,
        currentBalance: initialData.currentBalance ?? 0,
        isActive: initialData.isActive ?? true,
      });
    }
  }, [initialData]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value, type } = e.target;
    const checked =
      type === "checkbox" ? (e.target as HTMLInputElement).checked : undefined;

    setForm((prev) => ({
      ...prev,
      [name]: checked !== undefined ? checked : value,
    }));

    if (errors[name]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm((prev) => ({
      ...prev,
      [name]: value === "" ? 0 : Number(value),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    const parsed = bankAccountSchema.safeParse(form);
    if (!parsed.success) {
      setErrors(parsed.error.flatten().fieldErrors);
      return;
    }

    if (onSubmit) {
      await onSubmit(parsed.data);
    }
  };

  const handleCancel = () => {
    window.history.back();
  };

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      onClick: handleCancel,
      disabled: loading,
    },
    {
      label: isEdit ? "Update Bank Account" : "Save Bank Account",
      variant: "primary",
      onClick: handleSubmit as unknown as () => void,
      loading,
    },
  ];

  const renderField = (
    name: string,
    label: string,
    type: "text" | "select" | "number" = "text",
    options?: { label: string; value: string }[],
    placeholder?: string,
  ) => {
    const hasError = !!errors[name];
    const fieldValue = (form as Record<string, unknown>)[name];

    return (
      <div style={fieldGroupStyle}>
        <label style={labelStyle}>{label}</label>
        {type === "select" && options ? (
          <select
            name={name}
            style={selectStyle}
            value={String(fieldValue ?? "")}
            onChange={handleChange}
          >
            <option value="">{placeholder ?? `Select ${label}`}</option>
            {options.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        ) : (
          <input
            name={name}
            type={type}
            style={{
              ...inputStyle,
              borderColor: hasError ? colors.danger[500] : colors.border,
            }}
            value={String(fieldValue ?? "")}
            onChange={type === "number" ? handleNumberChange : handleChange}
            placeholder={placeholder ?? `Enter ${label.toLowerCase()}...`}
          />
        )}
        {hasError &&
          errors[name]?.map((err, i) => (
            <span key={i} style={errorTextStyle}>
              {err}
            </span>
          ))}
      </div>
    );
  };

  const bankOptions = banks.map((b) => ({ label: b.name, value: b.id }));

  return (
    <form onSubmit={handleSubmit}>
      <FormCard
        title="Bank Account Information"
        variant="teal-header"
        footer={{ actions: <ActionButtons actions={footerActions} /> }}
      >
        {/* Basic Info */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Basic Information</h4>
          <div style={gridStyle}>
            {renderField(
              "accountCode",
              "Account Code",
              "text",
              undefined,
              "e.g. BAC-001",
            )}
            {renderField(
              "accountName",
              "Account Name",
              "text",
              undefined,
              "Enter account name",
            )}
          </div>
        </div>

        {/* Bank Details */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Bank Details</h4>
          <div style={gridStyle}>
            {renderField("bankId", "Bank", "select", bankOptions)}
            {renderField(
              "accountNumber",
              "Account Number",
              "text",
              undefined,
              "Enter account number",
            )}
            {renderField(
              "branch",
              "Branch",
              "text",
              undefined,
              "Enter branch name",
            )}
            {renderField(
              "swiftCode",
              "Swift Code",
              "text",
              undefined,
              "e.g. KCBLKENX",
            )}
            {renderField("currency", "Currency", "text", undefined, "e.g. ETB")}
          </div>
        </div>

        {/* Balances */}
        <div style={sectionStyle}>
          <h4 style={sectionTitleStyle}>Balances</h4>
          <div style={gridStyle}>
            {renderField("openingBalance", "Opening Balance", "number")}
            {renderField("currentBalance", "Current Balance", "number")}
          </div>
        </div>

        {/* Status */}
        <div style={sectionStyle}>
          <div style={toggleRowStyle}>
            <input
              name="isActive"
              type="checkbox"
              style={checkboxStyle}
              checked={form.isActive}
              onChange={handleChange}
            />
            <span style={toggleLabelStyle}>Active</span>
          </div>
        </div>
      </FormCard>
    </form>
  );
}

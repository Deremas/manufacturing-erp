"use client";

import React, { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { FileDigit, Save, X } from "lucide-react";

export interface DocumentNumberingFormData {
  id?: string;
  module: string;
  documentType: string;
  prefix: string;
  currentNumber: number;
  padding: number;
  resetRule: string;
  includeYear: boolean;
  includeMonth: boolean;
  includeLocation: boolean;
  isActive: boolean;
}

export interface DocNumberingFormPageProps {
  isCreating?: boolean;
  initialData?: DocumentNumberingFormData;
}

const MODULE_OPTIONS = [
  "Procurement",
  "Inventory",
  "Production",
  "Sales",
  "Finance",
  "Administration",
];

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
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.surface,
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  outline: "none",
  boxSizing: "border-box",
  lineHeight: "20px",
  minHeight: "48px",
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: "pointer",
  appearance: "auto",
};

const rowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
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

function buildPreview(data: DocumentNumberingFormData) {
  const parts = [data.prefix.trim().toUpperCase() || "DOC"];
  if (data.includeYear) {
    parts.push("2026");
  }
  if (data.includeMonth) {
    parts.push("07");
  }
  if (data.includeLocation) {
    parts.push("LOC");
  }
  parts.push(String(data.currentNumber || 1).padStart(Math.max(1, Number(data.padding || 4)), "0"));
  return parts.join("-");
}

export default function DocumentNumberingFormPage({
  isCreating = true,
  initialData,
}: DocNumberingFormPageProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState("");
  const [form, setForm] = useState<DocumentNumberingFormData>({
    id: initialData?.id,
    module: initialData?.module ?? "Procurement",
    documentType: initialData?.documentType ?? "",
    prefix: initialData?.prefix ?? "",
    currentNumber: initialData?.currentNumber ?? 1,
    padding: initialData?.padding ?? 4,
    resetRule: initialData?.resetRule ?? "Never",
  includeYear: initialData?.includeYear ?? true,
  includeMonth: initialData?.includeMonth ?? false,
  includeLocation: initialData?.includeLocation ?? false,
    isActive: initialData?.isActive ?? true,
  });

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Document Numbering", href: "/administration/document-numbering" },
    { label: isCreating ? "Create Configuration" : "Edit Configuration" },
  ];

  const preview = useMemo(() => buildPreview(form), [form]);

  function updateField<Key extends keyof DocumentNumberingFormData>(
    key: Key,
    value: DocumentNumberingFormData[Key],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function handleSave() {
    setError("");
    startTransition(async () => {
      const endpoint = isCreating
        ? "/api/administration/document-numbering"
        : `/api/administration/document-numbering/${form.id}`;
      const response = await fetch(endpoint, {
        method: isCreating ? "POST" : "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const result = await response.json().catch(() => null);
      if (!response.ok) {
        setError(result?.error ?? "Unable to save document numbering configuration");
        return;
      }

      router.push("/administration/document-numbering");
      router.refresh();
    });
  }

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: () => router.push("/administration/document-numbering"),
      disabled: isPending,
    },
    {
      label: "Save",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: handleSave,
      loading: isPending,
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title={isCreating ? "Create Document Numbering" : "Edit Document Numbering"}
        breadcrumbs={breadcrumbs}
      />

      <FormCard title="Configuration" icon={<FileDigit size={18} />}>
        {error ? (
          <p style={{ marginTop: 0, marginBottom: 16, color: colors.danger[600] }}>
            {error}
          </p>
        ) : null}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Module</label>
              <select
                value={form.module}
                onChange={(event) => updateField("module", event.target.value)}
                style={selectStyle}
              >
                {MODULE_OPTIONS.map((module) => (
                  <option key={module} value={module}>
                    {module}
                  </option>
                ))}
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Document Type</label>
              <input
                type="text"
                value={form.documentType}
                onChange={(event) => updateField("documentType", event.target.value)}
                style={inputStyle}
                placeholder="e.g. Purchase Order"
              />
            </div>
          </div>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Prefix</label>
              <input
                type="text"
                value={form.prefix}
                onChange={(event) => updateField("prefix", event.target.value.toUpperCase())}
                style={inputStyle}
                placeholder="e.g. PO"
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Padding</label>
              <select
                value={String(form.padding)}
                onChange={(event) => updateField("padding", Number(event.target.value))}
                style={selectStyle}
              >
                {[3, 4, 5, 6].map((value) => (
                  <option key={value} value={String(value)}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Current Number</label>
              <input
                type="number"
                value={form.currentNumber}
                onChange={(event) => updateField("currentNumber", Number(event.target.value))}
                style={inputStyle}
                min="1"
              />
            </div>
          </div>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Reset Rule</label>
              <select
                value={form.resetRule}
                onChange={(event) => updateField("resetRule", event.target.value)}
                style={selectStyle}
              >
                {["Never", "Yearly", "Monthly", "Daily"].map((rule) => (
                  <option key={rule} value={rule}>
                    {rule}
                  </option>
                ))}
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Status</label>
              <select
                value={form.isActive ? "active" : "inactive"}
                onChange={(event) => updateField("isActive", event.target.value === "active")}
                style={selectStyle}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
      </FormCard>

      <FormCard title="Increments" icon={<FileDigit size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          <label style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={form.includeYear}
              onChange={(event) => updateField("includeYear", event.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: colors.primary[600] }}
            />
            <span style={{ fontFamily: typography.fontFamily, fontSize: typography.sizes.body.fontSize, color: colors.text.primary }}>
              Include Year
            </span>
          </label>
          <label style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={form.includeMonth}
              onChange={(event) => updateField("includeMonth", event.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: colors.primary[600] }}
            />
            <span style={{ fontFamily: typography.fontFamily, fontSize: typography.sizes.body.fontSize, color: colors.text.primary }}>
              Include Month
            </span>
          </label>
          <label style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={form.includeLocation}
              onChange={(event) => updateField("includeLocation", event.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: colors.primary[600] }}
            />
            <span style={{ fontFamily: typography.fontFamily, fontSize: typography.sizes.body.fontSize, color: colors.text.primary }}>
              Include Location Code
            </span>
          </label>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Preview</label>
            <div style={previewStyle}>{preview}</div>
          </div>
        </div>
      </FormCard>

      <div style={stickyFooterStyle}>
        <ActionButtons actions={footerActions} />
      </div>
    </div>
  );
}

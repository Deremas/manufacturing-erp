"use client";

import { useState, useTransition } from "react";

import { ActionButtons, FormCard, PageHeader } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import type { InventoryApprovalPolicy } from "@/services/inventory/inventory-policy.service";

interface InventoryPoliciesPageProps {
  policies: InventoryApprovalPolicy[];
}

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
};

const gridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
  gap: "16px",
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "6px",
};

const labelStyle: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.surface,
  color: colors.text.primary,
  fontSize: typography.sizes.body.fontSize,
  boxSizing: "border-box",
};

const toggleStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  padding: "10px 0",
};

export default function InventoryPoliciesPage({ policies }: InventoryPoliciesPageProps) {
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [rows, setRows] = useState<InventoryApprovalPolicy[]>(policies);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Inventory Approval Policies" },
  ];

  function updateRow(index: number, patch: Partial<InventoryApprovalPolicy>) {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  }

  function save() {
    setMessage("");
    startTransition(async () => {
      const response = await fetch("/api/administration/inventory-policies", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ policies: rows }),
      });
      const result = await response.json();

      if (!response.ok) {
        setMessage(result.error ?? "Unable to save inventory approval policies");
        return;
      }

      setRows(result.policies ?? rows);
      setMessage("Inventory approval policies saved.");
    });
  }

  const actions: Action[] = [
    {
      label: "Save Policies",
      variant: "primary",
      onClick: save,
      loading: isPending,
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Inventory Approval Policies"
        subtitle="Manage approval requirements for inventory documents without hardcoding rules into pages."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      {message ? (
        <div
          style={{
            padding: "12px 14px",
            borderRadius: radius.components.card,
            border: `1px solid ${message.includes("saved") ? colors.success[200] : colors.danger[200]}`,
            backgroundColor: message.includes("saved") ? colors.success[50] : colors.danger[50],
            color: message.includes("saved") ? colors.success[700] : colors.danger[700],
          }}
        >
          {message}
        </div>
      ) : null}

      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {rows.map((policy, index) => (
          <FormCard key={policy.documentType} title={policy.title} variant="teal-header">
            <div style={gridStyle}>
              <div style={fieldStyle}>
                <label style={labelStyle}>Require Approval</label>
                <select
                  style={inputStyle}
                  value={policy.requireApproval ? "yes" : "no"}
                  onChange={(event) => updateRow(index, { requireApproval: event.target.value === "yes" })}
                >
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Minimum Amount / Value Threshold</label>
                <input
                  style={inputStyle}
                  type="number"
                  min={0}
                  step="0.01"
                  value={policy.minimumValueThreshold}
                  onChange={(event) => updateRow(index, { minimumValueThreshold: Number(event.target.value) || 0 })}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Minimum Quantity Threshold</label>
                <input
                  style={inputStyle}
                  type="number"
                  min={0}
                  step="0.01"
                  value={policy.minimumQuantityThreshold}
                  onChange={(event) => updateRow(index, { minimumQuantityThreshold: Number(event.target.value) || 0 })}
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Required Role</label>
                <input
                  style={inputStyle}
                  value={policy.requiredRole}
                  onChange={(event) => updateRow(index, { requiredRole: event.target.value })}
                  placeholder="Leave blank for all roles"
                />
              </div>

              <div style={fieldStyle}>
                <label style={labelStyle}>Status</label>
                <select
                  style={inputStyle}
                  value={policy.isActive ? "active" : "inactive"}
                  onChange={(event) => updateRow(index, { isActive: event.target.value === "active" })}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>

              <div style={toggleStyle}>
                <input
                  id={`${policy.documentType}-admin`}
                  type="checkbox"
                  checked={policy.autoApproveForAdmin}
                  onChange={(event) => updateRow(index, { autoApproveForAdmin: event.target.checked })}
                  style={{ width: 18, height: 18, accentColor: colors.primary[600] }}
                />
                <label htmlFor={`${policy.documentType}-admin`} style={{ color: colors.text.primary }}>
                  Auto Approve for Admin
                </label>
              </div>
            </div>
          </FormCard>
        ))}
      </div>
    </div>
  );
}

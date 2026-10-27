"use client";

import { useEffect, useState, useTransition } from "react";
import { Plus, Save, Trash2, X } from "lucide-react";

import { ActionButtons, FormCard, PageHeader } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { notifyActionError, showToast } from "@/components/shared/toast";
import {
  settingsPageStyle,
  settingsStickyFooterStyle,
} from "@/features/administration/settings/settings-layout";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
  padding: `${spacing.page.padding}px`,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  maxWidth: 420,
  padding: "10px 12px",
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.surface,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  boxSizing: "border-box",
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

export default function ProcurementSettingsPage() {
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Settings", href: "/administration/settings" },
    { label: "Procurement" },
  ];

  async function loadItems() {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/administration/payment-terms", { cache: "no-store" });
      const payload = (await response.json()) as { error?: string; items?: string[] };
      if (!response.ok) {
        throw new Error(payload.error ?? "Failed to load payment terms");
      }
      setItems(payload.items ?? []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load payment terms");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadItems();
  }, []);

  function addTerm() {
    const value = draft.trim();
    if (!value) return;
    if (items.some((item) => item.toLowerCase() === value.toLowerCase())) {
      setError("That payment term already exists.");
      return;
    }
    setItems((current) => [...current, value]);
    setDraft("");
    setError("");
  }

  function removeTerm(index: number) {
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function save() {
    setMessage("");
    setError("");
    startTransition(async () => {
      const response = await fetch("/api/administration/payment-terms", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const payload = (await response.json()) as { error?: string; items?: string[] };
      if (!response.ok) {
        setError(payload.error ?? "Failed to save payment terms");
        notifyActionError(payload.error ?? "Failed to save payment terms");
        return;
      }
      setItems(payload.items ?? items);
      showToast({
        tone: "success",
        title: "Settings saved",
        message: "Payment terms were updated successfully.",
      });
    });
  }

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: () => void loadItems(),
      disabled: isPending,
    },
    {
      label: "Save",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: () => save(),
      loading: isPending,
    },
  ];

  return (
    <div style={settingsPageStyle}>
      <PageHeader
        title="Procurement Settings"
        subtitle="Manage payment terms used on purchase orders and supplier documents."
        breadcrumbs={breadcrumbs}
      />

      {error ? <p style={{ margin: 0, color: colors.danger[600] }}>{error}</p> : null}

      <FormCard title="Payment Terms" variant="teal-header">
        <p style={{ margin: "0 0 16px", color: colors.text.secondary, fontSize: typography.sizes.small.fontSize }}>
          These options appear in the Payment Terms dropdown when creating or editing purchase orders.
        </p>
        <div style={{ display: "flex", gap: 8, marginBottom: 16, opacity: loading ? 0.7 : 1 }}>
          <input
            style={inputStyle}
            value={draft}
            disabled={loading || isPending}
            placeholder="e.g. Net 45"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                addTerm();
              }
            }}
          />
          <button
            type="button"
            onClick={addTerm}
            disabled={loading || isPending || !draft.trim()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              padding: "0 14px",
              border: "none",
              borderRadius: radius.components.button,
              background: colors.primary[600],
              color: "#fff",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
          >
            <Plus size={16} />
            Add
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.length === 0 ? (
            <div style={{ color: colors.text.secondary }}>No payment terms configured yet.</div>
          ) : (
            items.map((item, index) => (
              <div
                key={`${item}-${index}`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 12,
                  padding: "12px 14px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.components.input,
                  background: colors.surface,
                }}
              >
                <span style={{ fontWeight: 600 }}>{item}</span>
                <button
                  type="button"
                  onClick={() => removeTerm(index)}
                  disabled={loading || isPending || items.length === 1}
                  aria-label={`Remove ${item}`}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 34,
                    height: 34,
                    border: `1px solid ${colors.danger[200]}`,
                    borderRadius: 8,
                    background: colors.danger[50],
                    color: colors.danger[700],
                    cursor: items.length === 1 ? "not-allowed" : "pointer",
                    opacity: items.length === 1 ? 0.45 : 1,
                  }}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </FormCard>

      <div style={settingsStickyFooterStyle}>
        <ActionButtons actions={footerActions} />
      </div>
    </div>
  );
}

"use client";

import React, { useEffect, useState } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { Settings, Package, CreditCard, Save, X } from "lucide-react";
import { notifyActionError, showToast } from "@/components/shared/toast";
import {
  settingsPageStyle,
  settingsRowStyle,
  settingsStickyFooterStyle,
} from "@/features/administration/settings/settings-layout";

type BankAccountOption = {
  id: string;
  accountName: string;
  accountNumber: string;
  bankName?: string;
};

type LocationOption = {
  id: string;
  locationName: string;
  locationCode: string;
};

type SettingsFormState = {
  defaultDateFormat: string;
  defaultTimezone: string;
  defaultCurrency: string;
  vatPercentage: number;
  excisePercentage: number;
  numberFormat: string;
  defaultLanguage: string;
  negativeStockAllowed: boolean;
  defaultValuation: string;
  requireTransferApproval: boolean;
  defaultBankAccountId: string;
  defaultCashLocationId: string;
  vatEnabled: boolean;
  procurementVatTreatment: "INCLUSIVE" | "EXCLUSIVE";
  lowStockThreshold: number;
};

const DEFAULT_STATE: SettingsFormState = {
  defaultDateFormat: "DD/MM/YYYY",
  defaultTimezone: "Africa/Nairobi",
  defaultCurrency: "ETB",
  vatPercentage: 15,
  excisePercentage: 0,
  numberFormat: "1,234.56",
  defaultLanguage: "English",
  negativeStockAllowed: false,
  defaultValuation: "FIFO",
  requireTransferApproval: true,
  defaultBankAccountId: "",
  defaultCashLocationId: "",
  vatEnabled: true,
  procurementVatTreatment: "INCLUSIVE",
  lowStockThreshold: 10,
};

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
  maxWidth: 420,
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
  height: "48px",
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
  maxWidth: 880,
};

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  paddingTop: "4px",
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

export default function SystemSettingsPage() {
  const [form, setForm] = useState<SettingsFormState>(DEFAULT_STATE);
  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [locations, setLocations] = useState<LocationOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "System Settings" },
  ];

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/administration/system-settings", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        error?: string;
        settings?: {
          defaultDateFormat: string;
          defaultTimezone: string;
          defaultCurrency: string;
          vatPercentage: number;
          excisePercentage: number;
          lowStockRules: {
            threshold: number;
            negativeStockAllowed: boolean;
          };
          numberFormat: string;
          defaultLanguage: string;
          defaultValuation: string;
          requireTransferApproval: boolean;
          defaultBankAccountId: string;
          defaultCashLocationId: string;
          vatEnabled: boolean;
          procurementVatTreatment?: "INCLUSIVE" | "EXCLUSIVE";
        };
        bankAccounts?: BankAccountOption[];
        locations?: LocationOption[];
      };

      if (!response.ok || !payload.settings) {
        throw new Error(payload.error || "Failed to load system settings");
      }

      setForm({
        defaultDateFormat: payload.settings.defaultDateFormat,
        defaultTimezone: payload.settings.defaultTimezone,
        defaultCurrency: payload.settings.defaultCurrency,
        vatPercentage: payload.settings.vatPercentage,
        excisePercentage: payload.settings.excisePercentage,
        numberFormat: payload.settings.numberFormat,
        defaultLanguage: payload.settings.defaultLanguage,
        negativeStockAllowed: payload.settings.lowStockRules.negativeStockAllowed,
        defaultValuation: payload.settings.defaultValuation,
        requireTransferApproval: payload.settings.requireTransferApproval,
        defaultBankAccountId: payload.settings.defaultBankAccountId,
        defaultCashLocationId: payload.settings.defaultCashLocationId,
        vatEnabled: payload.settings.vatEnabled,
        procurementVatTreatment:
          payload.settings.procurementVatTreatment === "EXCLUSIVE" ? "EXCLUSIVE" : "INCLUSIVE",
        lowStockThreshold: payload.settings.lowStockRules.threshold,
      });
      setBankAccounts(payload.bankAccounts ?? []);
      setLocations(payload.locations ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load system settings",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  const updateField = <K extends keyof SettingsFormState>(
    key: K,
    value: SettingsFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/administration/system-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          defaultDateFormat: form.defaultDateFormat,
          defaultTimezone: form.defaultTimezone,
          defaultCurrency: form.defaultCurrency,
          vatPercentage: form.vatPercentage,
          excisePercentage: form.excisePercentage,
          lowStockRules: {
            threshold: form.lowStockThreshold,
            negativeStockAllowed: form.negativeStockAllowed,
          },
          printSettings: {
            pageSize: "A4",
            orientation: "portrait",
            marginTop: 10,
            marginBottom: 10,
            marginLeft: 10,
            marginRight: 10,
          },
          numberFormat: form.numberFormat,
          defaultLanguage: form.defaultLanguage,
          defaultValuation: form.defaultValuation,
          requireTransferApproval: form.requireTransferApproval,
          defaultBankAccountId: form.defaultBankAccountId,
          defaultCashLocationId: form.defaultCashLocationId,
          vatEnabled: form.vatEnabled,
          procurementVatTreatment: form.procurementVatTreatment,
        }),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save system settings");
      }
      showToast({
        tone: "success",
        title: "Settings saved",
        message: "System settings were updated successfully.",
      });
    } catch (saveError) {
      const text =
        saveError instanceof Error
          ? saveError.message
          : "Failed to save system settings";
      setError(text);
      notifyActionError(text);
    } finally {
      setSaving(false);
    }
  };

  const footerActions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      icon: <X size={16} />,
      onClick: () => void loadSettings(),
      disabled: saving,
    },
    {
      label: "Save",
      variant: "primary",
      icon: <Save size={16} />,
      onClick: () => void handleSave(),
      loading: saving,
    },
  ];

  return (
    <div style={settingsPageStyle}>
      <PageHeader title="System Settings" breadcrumbs={breadcrumbs} />

      {error ? (
        <div style={{ color: colors.danger[600], fontFamily: typography.fontFamily }}>
          {error}
        </div>
      ) : null}

      <FormCard
        title="General Settings"
        icon={<Settings size={18} />}
        variant="teal-header"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", opacity: loading ? 0.7 : 1 }}>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Currency</label>
              <select
                value={form.defaultCurrency}
                onChange={(event) => updateField("defaultCurrency", event.target.value)}
                style={selectStyle}
                disabled={loading}
              >
                <option value="ETB">ETB - Ethiopian Birr</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Timezone</label>
              <select
                value={form.defaultTimezone}
                onChange={(event) => updateField("defaultTimezone", event.target.value)}
                style={selectStyle}
                disabled={loading}
              >
                <option value="Africa/Nairobi">Africa/Nairobi (UTC+3)</option>
                <option value="Africa/Addis_Ababa">Africa/Addis_Ababa (UTC+3)</option>
                <option value="UTC">UTC</option>
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Date Format</label>
              <select
                value={form.defaultDateFormat}
                onChange={(event) => updateField("defaultDateFormat", event.target.value)}
                style={selectStyle}
                disabled={loading}
              >
                <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                <option value="YYYY-MM-DD">YYYY-MM-DD</option>
              </select>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Number Format</label>
              <select
                value={form.numberFormat}
                onChange={(event) => updateField("numberFormat", event.target.value)}
                style={selectStyle}
                disabled={loading}
              >
                <option value="1,234.56">1,234.56</option>
                <option value="1.234,56">1.234,56</option>
                <option value="1 234.56">1 234.56</option>
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Language</label>
              <select
                value={form.defaultLanguage}
                onChange={(event) => updateField("defaultLanguage", event.target.value)}
                style={selectStyle}
                disabled={loading}
              >
                <option value="English">English</option>
                <option value="Amharic">Amharic</option>
              </select>
            </div>
          </div>
        </div>
      </FormCard>

      <FormCard title="Inventory Settings" icon={<Package size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", opacity: loading ? 0.7 : 1 }}>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Low Stock Threshold</label>
              <input
                type="number"
                value={form.lowStockThreshold}
                onChange={(event) =>
                  updateField("lowStockThreshold", Number(event.target.value))
                }
                style={inputStyle}
                disabled={loading}
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Valuation Method</label>
              <select
                value={form.defaultValuation}
                onChange={(event) => updateField("defaultValuation", event.target.value)}
                style={selectStyle}
                disabled={loading}
              >
                <option value="FIFO">FIFO - First In First Out</option>
                <option value="LIFO">LIFO - Last In First Out</option>
                <option value="AVG">Average Cost</option>
              </select>
            </div>
          </div>
          <div style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={form.negativeStockAllowed}
              onChange={(event) =>
                updateField("negativeStockAllowed", event.target.checked)
              }
              style={{ width: "18px", height: "18px", accentColor: colors.primary[600] }}
              disabled={loading}
            />
            <span style={{ fontFamily: typography.fontFamily, fontSize: typography.sizes.body.fontSize, color: colors.text.primary }}>
              Allow Negative Stock
            </span>
          </div>
          <div style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={form.requireTransferApproval}
              onChange={(event) =>
                updateField("requireTransferApproval", event.target.checked)
              }
              style={{ width: "18px", height: "18px", accentColor: colors.primary[600] }}
              disabled={loading}
            />
            <span style={{ fontFamily: typography.fontFamily, fontSize: typography.sizes.body.fontSize, color: colors.text.primary }}>
              Require Transfer Approval
            </span>
          </div>
        </div>
      </FormCard>

      <FormCard title="Sales/Finance Settings" icon={<CreditCard size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", opacity: loading ? 0.7 : 1 }}>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Bank Account</label>
              <select
                value={form.defaultBankAccountId}
                onChange={(event) =>
                  updateField("defaultBankAccountId", event.target.value)
                }
                style={selectStyle}
                disabled={loading}
              >
                <option value="">Select ...</option>
                {bankAccounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.bankName ? `${account.bankName} - ` : ""}
                    {account.accountName} - {account.accountNumber}
                  </option>
                ))}
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Cash Location</label>
              <select
                value={form.defaultCashLocationId}
                onChange={(event) =>
                  updateField("defaultCashLocationId", event.target.value)
                }
                style={selectStyle}
                disabled={loading}
              >
                <option value="">Select ...</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.locationCode} - {location.locationName}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>VAT Percentage</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.vatPercentage}
                onChange={(event) =>
                  updateField("vatPercentage", Number(event.target.value))
                }
                style={inputStyle}
                disabled={loading}
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Excise Percentage</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={form.excisePercentage}
                onChange={(event) =>
                  updateField("excisePercentage", Number(event.target.value))
                }
                style={inputStyle}
                disabled={loading}
              />
            </div>
          </div>
          <div style={rowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Procurement VAT Treatment</label>
              <select
                value={form.procurementVatTreatment}
                onChange={(event) =>
                  updateField(
                    "procurementVatTreatment",
                    event.target.value === "EXCLUSIVE" ? "EXCLUSIVE" : "INCLUSIVE",
                  )
                }
                style={selectStyle}
                disabled={loading}
              >
                <option value="INCLUSIVE">Inclusive (unit prices include VAT)</option>
                <option value="EXCLUSIVE">Exclusive (VAT added on top)</option>
              </select>
            </div>
          </div>
          <div style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={form.vatEnabled}
              onChange={(event) => updateField("vatEnabled", event.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: colors.primary[600] }}
              disabled={loading}
            />
            <span style={{ fontFamily: typography.fontFamily, fontSize: typography.sizes.body.fontSize, color: colors.text.primary }}>
              VAT Enabled
            </span>
          </div>
        </div>
      </FormCard>

      <div style={settingsStickyFooterStyle}>
        <ActionButtons actions={footerActions} />
      </div>
    </div>
  );
}

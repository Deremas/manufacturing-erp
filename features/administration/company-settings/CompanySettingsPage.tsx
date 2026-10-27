"use client";

import React, { useEffect, useState } from "react";
import { PageHeader, FormCard, ActionButtons } from "@/components/shared";
import type { Breadcrumb, Action } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import {
  Building2,
  Printer,
  DollarSign,
  Save,
  X,
  Upload,
} from "lucide-react";
import { showToast, notifyActionError } from "@/components/shared/toast";
import {
  settingsFormShellStyle,
  settingsPageStyle,
  settingsRowStyle,
  settingsStickyFooterStyle,
} from "@/features/administration/settings/settings-layout";

type TaxCodeOption = {
  id: string;
  taxName: string;
  rate: number;
};

type CompanyFormState = {
  companyName: string;
  tradeName: string;
  tinNumber: string;
  vatNumber: string;
  address: string;
  phone: string;
  email: string;
  website: string;
  printLogo: boolean;
  printCompanyName: boolean;
  footerText: string;
  signatureLabel: string;
  defaultCurrency: string;
  fiscalYearStart: string;
  defaultTaxCodeId: string;
  procurementVatEnabled: boolean;
  reportHeaderInfo: string;
  invoiceFooter: string;
};

const DEFAULT_STATE: CompanyFormState = {
  companyName: "",
  tradeName: "",
  tinNumber: "",
  vatNumber: "",
  address: "",
  phone: "",
  email: "",
  website: "",
  printLogo: true,
  printCompanyName: true,
  footerText: "",
  signatureLabel: "Authorized Signature",
  defaultCurrency: "ETB",
  fiscalYearStart: "",
  defaultTaxCodeId: "",
  procurementVatEnabled: true,
  reportHeaderInfo: "",
  invoiceFooter: "",
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

const textareaStyle: React.CSSProperties = {
  ...inputStyle,
  maxWidth: "100%",
  height: "80px",
  resize: "vertical",
};

const toggleRowStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  paddingTop: "4px",
};

export default function CompanySettingsPage() {
  const [form, setForm] = useState<CompanyFormState>(DEFAULT_STATE);
  const [taxCodes, setTaxCodes] = useState<TaxCodeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Company Settings" },
  ];

  async function loadSettings() {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/administration/company-settings", {
        cache: "no-store",
      });
      const payload = (await response.json()) as {
        error?: string;
        settings?: Partial<CompanyFormState>;
        taxCodes?: TaxCodeOption[];
      };

      if (!response.ok || !payload.settings) {
        throw new Error(payload.error || "Failed to load company settings");
      }

      setForm({
        ...DEFAULT_STATE,
        ...payload.settings,
        companyName: payload.settings.companyName ?? "",
        tradeName: payload.settings.tradeName ?? payload.settings.companyName ?? "",
        fiscalYearStart: payload.settings.fiscalYearStart ?? "",
        defaultCurrency: payload.settings.defaultCurrency ?? "ETB",
      });
      setTaxCodes(payload.taxCodes ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load company settings",
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  const updateField = <K extends keyof CompanyFormState>(
    key: K,
    value: CompanyFormState[K],
  ) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/administration/company-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const payload = (await response.json()) as { error?: string };
      if (!response.ok) {
        throw new Error(payload.error || "Failed to save company settings");
      }
      showToast({
        tone: "success",
        title: "Settings saved",
        message: "Company settings were updated successfully.",
      });
    } catch (saveError) {
      const text =
        saveError instanceof Error
          ? saveError.message
          : "Failed to save company settings";
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
      <PageHeader title="Company Settings" breadcrumbs={breadcrumbs} />

      {error ? (
        <div style={{ color: colors.danger[600], fontFamily: typography.fontFamily }}>
          {error}
        </div>
      ) : null}

      <div style={settingsFormShellStyle}>
      <FormCard
        title="Company Profile"
        icon={<Building2 size={18} />}
        variant="teal-header"
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", opacity: loading ? 0.7 : 1 }}>
          <div style={settingsRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Company Name</label>
              <input
                type="text"
                value={form.companyName}
                onChange={(event) => updateField("companyName", event.target.value)}
                style={inputStyle}
                disabled={loading}
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Trade Name</label>
              <input
                type="text"
                value={form.tradeName}
                onChange={(event) => updateField("tradeName", event.target.value)}
                style={inputStyle}
                disabled={loading}
              />
            </div>
          </div>
          <div style={settingsRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>TIN</label>
              <input
                type="text"
                value={form.tinNumber}
                onChange={(event) => updateField("tinNumber", event.target.value)}
                style={inputStyle}
                disabled={loading}
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>VAT Number</label>
              <input
                type="text"
                value={form.vatNumber}
                onChange={(event) => updateField("vatNumber", event.target.value)}
                style={inputStyle}
                disabled={loading}
              />
            </div>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Company Logo</label>
            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              <div
                style={{
                  width: "48px",
                  height: "48px",
                  borderRadius: radius.scale.sm,
                  backgroundColor: colors.secondary[100],
                  border: `1px solid ${colors.border}`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: colors.text.muted,
                  fontSize: "20px",
                  fontWeight: 600,
                }}
              >
                {form.companyName.trim().charAt(0).toUpperCase() || "C"}
              </div>
              <button
                type="button"
                disabled
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "8px 16px",
                  border: `1px solid ${colors.border}`,
                  borderRadius: radius.components.button,
                  backgroundColor: colors.surface,
                  color: colors.text.secondary,
                  cursor: "not-allowed",
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.body.fontSize,
                }}
              >
                <Upload size={16} /> Logo upload will be wired next
              </button>
            </div>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Address</label>
            <textarea
              value={form.address}
              onChange={(event) => updateField("address", event.target.value)}
              style={textareaStyle}
              rows={3}
              disabled={loading}
            />
          </div>
          <div style={settingsRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Phone</label>
              <input
                type="text"
                value={form.phone}
                onChange={(event) => updateField("phone", event.target.value)}
                style={inputStyle}
                disabled={loading}
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                value={form.email}
                onChange={(event) => updateField("email", event.target.value)}
                style={inputStyle}
                disabled={loading}
              />
            </div>
          </div>
          <div style={settingsRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Website</label>
              <input
                type="text"
                value={form.website}
                onChange={(event) => updateField("website", event.target.value)}
                style={inputStyle}
                disabled={loading}
              />
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Report Header Info</label>
              <input
                type="text"
                value={form.reportHeaderInfo}
                onChange={(event) =>
                  updateField("reportHeaderInfo", event.target.value)
                }
                style={inputStyle}
                disabled={loading}
              />
            </div>
          </div>
        </div>
      </FormCard>

      <FormCard title="Print Settings" icon={<Printer size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", opacity: loading ? 0.7 : 1 }}>
          <div style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={form.printLogo}
              onChange={(event) => updateField("printLogo", event.target.checked)}
              style={{ width: "18px", height: "18px", accentColor: colors.primary[600] }}
              disabled={loading}
            />
            <span style={{ fontFamily: typography.fontFamily, fontSize: typography.sizes.body.fontSize, color: colors.text.primary }}>
              Print Logo on documents
            </span>
          </div>
          <div style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={form.printCompanyName}
              onChange={(event) =>
                updateField("printCompanyName", event.target.checked)
              }
              style={{ width: "18px", height: "18px", accentColor: colors.primary[600] }}
              disabled={loading}
            />
            <span style={{ fontFamily: typography.fontFamily, fontSize: typography.sizes.body.fontSize, color: colors.text.primary }}>
              Print Company Name on documents
            </span>
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Footer Text</label>
            <textarea
              value={form.footerText}
              onChange={(event) => updateField("footerText", event.target.value)}
              style={textareaStyle}
              rows={2}
              disabled={loading}
            />
          </div>
          <div style={formGroupStyle}>
            <label style={labelStyle}>Signature Label</label>
            <input
              type="text"
              value={form.signatureLabel}
              onChange={(event) =>
                updateField("signatureLabel", event.target.value)
              }
              style={inputStyle}
              disabled={loading}
            />
          </div>
        </div>
      </FormCard>

      <FormCard title="Fiscal Settings" icon={<DollarSign size={18} />}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px", opacity: loading ? 0.7 : 1 }}>
          <div style={settingsRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Currency</label>
              <select
                value={form.defaultCurrency}
                onChange={(event) =>
                  updateField("defaultCurrency", event.target.value)
                }
                style={selectStyle}
                disabled={loading}
              >
                <option value="ETB">ETB - Ethiopian Birr</option>
                <option value="USD">USD - US Dollar</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Fiscal Year Start</label>
              <input
                type="date"
                value={form.fiscalYearStart}
                onChange={(event) =>
                  updateField("fiscalYearStart", event.target.value)
                }
                style={inputStyle}
                disabled={loading}
              />
            </div>
          </div>
          <div style={settingsRowStyle}>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Default Procurement VAT</label>
              <select
                value={form.defaultTaxCodeId}
                onChange={(event) =>
                  updateField("defaultTaxCodeId", event.target.value)
                }
                style={selectStyle}
                disabled={loading}
              >
                <option value="">Select ...</option>
                {taxCodes.map((taxCode) => (
                  <option key={taxCode.id} value={taxCode.id}>
                    {taxCode.taxName} ({taxCode.rate}%)
                  </option>
                ))}
              </select>
            </div>
            <div style={formGroupStyle}>
              <label style={labelStyle}>Invoice Footer</label>
              <input
                type="text"
                value={form.invoiceFooter}
                onChange={(event) =>
                  updateField("invoiceFooter", event.target.value)
                }
                style={inputStyle}
                disabled={loading}
              />
            </div>
          </div>
          <div style={toggleRowStyle}>
            <input
              type="checkbox"
              checked={form.procurementVatEnabled}
              onChange={(event) =>
                updateField("procurementVatEnabled", event.target.checked)
              }
              style={{ width: "18px", height: "18px", accentColor: colors.primary[600] }}
              disabled={loading}
            />
            <span style={{ fontFamily: typography.fontFamily, fontSize: typography.sizes.body.fontSize, color: colors.text.primary }}>
              Apply VAT on purchase orders
            </span>
          </div>
        </div>
      </FormCard>

      <div style={settingsStickyFooterStyle}>
        <ActionButtons actions={footerActions} />
      </div>
      </div>
    </div>
  );
}

"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, X } from "lucide-react";

import { ActionButtons, FormCard, PageHeader } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { PRICE_CHANNEL_OPTIONS } from "@/lib/pricing/channels";
import { publicViewUrl, publicViewUrlFromPayload } from "@/lib/routing/urls";
import { formatCurrency } from "@/lib/utils/cn";
import { priceListSchema, type PriceListInput } from "@/validators/master-data";
import type { Customer, Location, PriceList } from "@/features/master-data/types";
import type { SaleableItemOption } from "@/services/master-data/priceListService";

export interface PriceListFormProps {
  initialData?: PriceList;
  saleableItems: SaleableItemOption[];
  customers: Customer[];
  locations: Location[];
  customerGroups: string[];
  currencyCode: string;
  currencyLabel: string;
  mode: "create" | "edit";
}

type FormRow = {
  rowId: string;
  itemId: string;
  unitId: string;
  unitPrice: number;
  minimumQty: number;
  taxIncluded: boolean;
  isActive: boolean;
};

const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: "24px",
  padding: "24px",
  background: "#f8fafc",
};

const responsiveGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: "16px",
};

const fieldStyle: React.CSSProperties = {
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
  minHeight: "46px",
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: "12px",
  padding: "10px 14px",
  background: "#fff",
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  boxSizing: "border-box",
};

const textAreaStyle: React.CSSProperties = {
  ...inputStyle,
  minHeight: "110px",
  resize: "vertical",
};

const toggleStyle: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: "10px",
  minHeight: "46px",
};

const tableWrapStyle: React.CSSProperties = {
  overflowX: "auto",
  paddingBottom: "8px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const tableStyle: React.CSSProperties = {
  minWidth: "980px",
  width: "100%",
  borderCollapse: "separate",
  borderSpacing: "0 12px",
};

const thStyle: React.CSSProperties = {
  textAlign: "left",
  padding: "0 8px",
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.semibold,
  letterSpacing: "0.04em",
};

const cellStyle: React.CSSProperties = {
  padding: "0 8px",
  verticalAlign: "top",
};

const helperStyle: React.CSSProperties = {
  fontSize: typography.sizes.caption.fontSize,
  color: colors.text.secondary,
};

const rowErrorStyle: React.CSSProperties = {
  fontSize: typography.sizes.caption.fontSize,
  color: colors.danger[600],
  marginTop: "4px",
};

const addButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 8,
  height: 32,
  padding: "0 12px",
  border: "none",
  borderRadius: 6,
  background: colors.primary[600],
  color: "white",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  width: "fit-content",
};

const removeButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  minWidth: 28,
  maxWidth: 28,
  height: 28,
  padding: 0,
  border: `1px solid ${colors.danger[300]}`,
  color: colors.danger[700],
  background: colors.danger[50],
  borderRadius: 6,
  fontWeight: typography.weights.bold,
  cursor: "pointer",
  justifySelf: "center",
};

const minQtyHeaderStyle: React.CSSProperties = {
  ...thStyle,
  width: "78px",
  minWidth: "78px",
};

const minQtyCellStyle: React.CSSProperties = {
  ...cellStyle,
  width: "78px",
  minWidth: "78px",
};

const minQtyInputStyle: React.CSSProperties = {
  ...inputStyle,
  maxWidth: "78px",
  paddingLeft: "12px",
  paddingRight: "8px",
};

const alertStyle: React.CSSProperties = {
  borderRadius: "12px",
  padding: "12px 14px",
  background: colors.danger[50],
  border: `1px solid ${colors.danger[200]}`,
  color: colors.danger[700],
  fontSize: typography.sizes.caption.fontSize,
};

function createEmptyRow(): FormRow {
  return {
    rowId: crypto.randomUUID(),
    itemId: "",
    unitId: "",
    unitPrice: 0,
    minimumQty: 1,
    taxIncluded: false,
    isActive: true,
  };
}

function mapInitialRows(initialData?: PriceList): FormRow[] {
  if (!initialData?.items?.length) {
    return [createEmptyRow()];
  }

  return initialData.items.map((item) => ({
    rowId: item.id || crypto.randomUUID(),
    itemId: item.itemId,
    unitId: item.unitId ?? "",
    unitPrice: Number(item.unitPrice ?? 0),
    minimumQty: Number(item.minimumQty ?? 1),
    taxIncluded: Boolean(item.taxIncluded),
    isActive: item.isActive ?? true,
  }));
}

export default function PriceListForm({
  initialData,
  saleableItems,
  customers,
  locations,
  customerGroups,
  currencyCode,
  currencyLabel,
  mode,
}: PriceListFormProps) {
  const router = useRouter();
  const isEdit = mode === "edit";

  const [form, setForm] = useState<PriceListInput>({
    code: initialData?.code ?? "",
    name: initialData?.name ?? "",
    channel: initialData?.channel ?? "FACTORY",
    currency: initialData?.currency ?? currencyCode,
    customerGroup: initialData?.customerGroup ?? "",
    customerId: initialData?.customerId ?? "",
    locationId: initialData?.locationId ?? "",
    description: initialData?.description ?? "",
    effectiveFrom: initialData?.effectiveFrom?.slice(0, 10) ?? "",
    effectiveTo: initialData?.effectiveTo?.slice(0, 10) ?? "",
    isDefault: initialData?.isDefault ?? false,
    isActive: initialData?.isActive ?? true,
    items: mapInitialRows(initialData).map((item) => ({
      itemId: item.itemId,
      unitId: item.unitId,
      unitPrice: item.unitPrice,
      minimumQty: item.minimumQty,
      taxIncluded: item.taxIncluded,
      isActive: item.isActive,
    })),
  });
  const [rows, setRows] = useState<FormRow[]>(mapInitialRows(initialData));
  const [errors, setErrors] = useState<Record<string, string[]>>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const saleableMap = useMemo(
    () => new Map(saleableItems.map((item) => [item.id, item])),
    [saleableItems],
  );

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Price Lists", href: "/master-data/price-lists" },
    { label: isEdit ? "Edit" : "Create" },
  ];

  const syncRowsToForm = (nextRows: FormRow[]) => {
    setRows(nextRows);
    setForm((current) => ({
      ...current,
      items: nextRows.map((row) => ({
        itemId: row.itemId,
        unitId: row.unitId,
        unitPrice: Number(row.unitPrice ?? 0),
        minimumQty: Number(row.minimumQty ?? 1),
        taxIncluded: row.taxIncluded,
        isActive: row.isActive,
      })),
    }));
  };

  const updateField = (name: keyof PriceListInput, value: string | boolean) => {
    setForm((current) => ({ ...current, [name]: value }));
    setFormError("");
  };

  const updateRow = (rowId: string, field: keyof FormRow, value: string | number | boolean) => {
    const nextRows = rows.map((row) => {
      if (row.rowId !== rowId) {
        return row;
      }

      const nextRow = { ...row, [field]: value };
      if (field === "itemId") {
        const item = saleableMap.get(String(value));
        nextRow.unitId = item?.unitId ?? "";
      }

      return nextRow;
    });

    syncRowsToForm(nextRows);
  };

  const addRow = () => syncRowsToForm([...rows, createEmptyRow()]);

  const removeRow = (rowId: string) => {
    const index = rows.findIndex((row) => row.rowId === rowId);
    syncRowsToForm(blankOrRemoveRow(rows, index < 0 ? 0 : index, createEmptyRow()));
  };

  const actions: Action[] = [
    {
      label: "Cancel",
      variant: "secondary",
      disabled: submitting,
      onClick: () =>
        router.push(
          initialData
            ? publicViewUrl("master-data.price-list", initialData.publicId)
            : "/master-data/price-lists",
        ),
    },
    {
      label: isEdit ? "Update Price List" : "Save Price List",
      variant: "primary",
      loading: submitting,
      onClick: async () => {
        setErrors({});
        setFormError("");

        const parsed = priceListSchema.safeParse(form);
        if (!parsed.success) {
          setErrors(parsed.error.flatten().fieldErrors);
          return;
        }

        try {
          setSubmitting(true);

          const response = await fetch(
            isEdit
              ? `/api/master-data/price-lists/${initialData?.id}`
              : "/api/master-data/price-lists",
            {
              method: isEdit ? "PUT" : "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(parsed.data),
            },
          );

          const payload = (await response.json()) as {
            item?: { id: string; publicId?: number };
            error?: string;
          };

          if (!response.ok) {
            const message = payload.error ?? "Failed to save price list";
            if (/default price list already exists/i.test(message)) {
              setErrors((current) => ({
                ...current,
                isDefault: [message],
              }));
            } else if (/duplicate item rows/i.test(message)) {
              setErrors((current) => ({
                ...current,
                items: [message],
              }));
            } else if (/code .* already exists/i.test(message)) {
              setErrors((current) => ({
                ...current,
                code: [message],
              }));
            } else {
              setFormError(message);
            }
            return;
          }

          router.push(
            publicViewUrlFromPayload(
              "master-data.price-list",
              payload,
              initialData
                ? publicViewUrl("master-data.price-list", initialData.publicId)
                : "/master-data/price-lists",
            ),
          );
          router.refresh();
        } finally {
          setSubmitting(false);
        }
      },
    },
  ];

  return (
    <div style={pageStyle}>
      <PageHeader
        title={isEdit ? "Edit Price List" : "Create Price List"}
        subtitle="Define channel-based finished goods selling prices"
        breadcrumbs={breadcrumbs}
      />

      <FormCard title="Basic Information" variant="teal-header">
        <div style={responsiveGrid}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Code *</label>
            <input
              style={inputStyle}
              value={form.code}
              onChange={(event) => updateField("code", event.target.value.toUpperCase())}
              placeholder="PL-FACTORY-001"
            />
            {errors.code?.map((error) => (
              <span key={error} style={rowErrorStyle}>{error}</span>
            ))}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Name *</label>
            <input
              style={inputStyle}
              value={form.name}
              onChange={(event) => updateField("name", event.target.value)}
              placeholder="Factory Finished Goods Price List"
            />
            {errors.name?.map((error) => (
              <span key={error} style={rowErrorStyle}>{error}</span>
            ))}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Channel *</label>
            <select
              style={inputStyle}
              value={form.channel}
              onChange={(event) => updateField("channel", event.target.value)}
            >
              {PRICE_CHANNEL_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            {errors.channel?.map((error) => (
              <span key={error} style={rowErrorStyle}>{error}</span>
            ))}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Currency</label>
            <input
              style={inputStyle}
              value={form.currency}
              onChange={(event) => updateField("currency", event.target.value.toUpperCase())}
              placeholder="ETB"
            />
            <span style={helperStyle}>System default currency: {currencyCode} ({currencyLabel})</span>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Effective From *</label>
            <input
              style={inputStyle}
              type="date"
              value={form.effectiveFrom}
              onChange={(event) => updateField("effectiveFrom", event.target.value)}
            />
            {errors.effectiveFrom?.map((error) => (
              <span key={error} style={rowErrorStyle}>{error}</span>
            ))}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Effective To</label>
            <input
              style={inputStyle}
              type="date"
              value={form.effectiveTo}
              onChange={(event) => updateField("effectiveTo", event.target.value)}
            />
            {errors.effectiveTo?.map((error) => (
              <span key={error} style={rowErrorStyle}>{error}</span>
            ))}
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Branch / Location</label>
            <select
              style={inputStyle}
              value={form.locationId}
              onChange={(event) => updateField("locationId", event.target.value)}
            >
              <option value="">All eligible locations</option>
              {locations
                .filter((location) => location.isActive)
                .map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.locationCode} - {location.locationName}
                  </option>
                ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Customer Group</label>
            <select
              style={inputStyle}
              value={form.customerGroup}
              onChange={(event) => updateField("customerGroup", event.target.value)}
            >
              <option value="">All customer groups</option>
              {customerGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div style={fieldStyle}>
            <label style={labelStyle}>Customer / Agent</label>
            <select
              style={inputStyle}
              value={form.customerId}
              onChange={(event) => updateField("customerId", event.target.value)}
            >
              <option value="">All customers / agents</option>
              {customers
                .filter((customer) => customer.isActive)
                .map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.customerCode} - {customer.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: "16px", ...fieldStyle }}>
          <label style={labelStyle}>Description</label>
          <textarea
            style={textAreaStyle}
            value={form.description}
            onChange={(event) => updateField("description", event.target.value)}
            placeholder="Optional notes about where and how this price list applies"
          />
        </div>

        <div style={{ marginTop: "16px", ...responsiveGrid }}>
          <label style={toggleStyle}>
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => updateField("isDefault", event.target.checked)}
            />
            <span>Set as default for this channel</span>
          </label>
          <label style={toggleStyle}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => updateField("isActive", event.target.checked)}
            />
            <span>Active</span>
          </label>
        </div>

        {errors.isDefault?.map((error) => (
          <div key={error} style={{ ...rowErrorStyle, marginTop: "10px" }}>{error}</div>
        ))}
      </FormCard>

      <FormCard title="Price Items" variant="teal-header">
        <div className="erp-table-scroll" style={tableWrapStyle}>
          <table style={tableStyle}>
            <thead>
              <tr>
                <th style={thStyle}>ITEM *</th>
                <th style={thStyle}>UOM</th>
                <th style={thStyle}>UNIT PRICE ({currencyCode}) *</th>
                <th style={minQtyHeaderStyle}>MIN QTY</th>
                <th style={thStyle}>TAX INCLUDED</th>
                <th style={thStyle}>ACTIVE</th>
                <th style={thStyle}>REMOVE</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => {
                const item = saleableMap.get(row.itemId);

                return (
                  <tr key={row.rowId}>
                    <td style={cellStyle}>
                      <select
                        style={inputStyle}
                        value={row.itemId}
                        onChange={(event) => updateRow(row.rowId, "itemId", event.target.value)}
                      >
                        <option value="">Select ...</option>
                        {saleableItems.map((option) => (
                          <option key={option.id} value={option.id}>
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={cellStyle}>
                      <input
                        style={{ ...inputStyle, background: colors.secondary[50] }}
                        value={
                          item
                            ? `${item.uomCode ? `${item.uomCode} - ` : ""}${item.uomName ?? ""}`
                            : ""
                        }
                        placeholder="Auto-filled UOM"
                        readOnly
                      />
                    </td>
                    <td style={cellStyle}>
                      <input
                        style={inputStyle}
                        type="number"
                        value={row.unitPrice === 0 ? "" : row.unitPrice}
                        onFocus={(event) => {
                          if (event.currentTarget.value === "0") {
                            event.currentTarget.select();
                          }
                        }}
                        onChange={(event) =>
                          updateRow(
                            row.rowId,
                            "unitPrice",
                            event.target.value === "" ? 0 : Number(event.target.value),
                          )
                        }
                        min={0}
                        step="0.01"
                      />
                    </td>
                    <td style={minQtyCellStyle}>
                      <input
                        style={minQtyInputStyle}
                        type="number"
                        value={row.minimumQty}
                        onChange={(event) =>
                          updateRow(
                            row.rowId,
                            "minimumQty",
                            event.target.value === "" ? 1 : Number(event.target.value),
                          )
                        }
                        min={1}
                      />
                    </td>
                    <td style={cellStyle}>
                      <label style={toggleStyle}>
                        <input
                          type="checkbox"
                          checked={row.taxIncluded}
                          onChange={(event) =>
                            updateRow(row.rowId, "taxIncluded", event.target.checked)
                          }
                        />
                        <span>Yes</span>
                      </label>
                    </td>
                    <td style={cellStyle}>
                      <label style={toggleStyle}>
                        <input
                          type="checkbox"
                          checked={row.isActive}
                          onChange={(event) =>
                            updateRow(row.rowId, "isActive", event.target.checked)
                          }
                        />
                        <span>Active</span>
                      </label>
                    </td>
                    <td style={cellStyle}>
                      <button
                        type="button"
                        className="erp-remove-row-btn"
                        style={removeButtonStyle}
                        onClick={() => removeRow(row.rowId)}
                        aria-label={index === 0 ? "Clear row" : `Remove row ${index + 1}`}
                      >
                        <X size={16} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
          <button type="button" style={addButtonStyle} onClick={addRow}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
              <Plus size={16} />
              <span>Add Item</span>
            </span>
          </button>
        </div>

        {errors.items?.map((error) => (
          <div key={error} style={rowErrorStyle}>{error}</div>
        ))}
      </FormCard>

      <FormCard title="Review" variant="teal-header" footer={{ actions: <ActionButtons actions={actions} /> }}>
        <div style={responsiveGrid}>
          <div style={helperStyle}>
            Active rows: {rows.filter((row) => row.isActive).length}
          </div>
          <div style={helperStyle}>
            Estimated visible price value:{" "}
            {formatCurrency(
              rows.reduce((sum, row) => sum + (row.isActive ? row.unitPrice : 0), 0),
              currencyCode,
            )}
          </div>
        </div>
        {formError ? <div style={{ ...alertStyle, marginTop: "16px" }}>{formError}</div> : null}
      </FormCard>
    </div>
  );
}

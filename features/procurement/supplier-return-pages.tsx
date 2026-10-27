"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { ActionButtons, FormCard, FormattedNumberInput, PageHeader, useFormSubmit } from "@/components/shared";
import type { Action, Breadcrumb } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { procurementViewUrl } from "@/lib/procurement/routes";

type Option = { value: string; label: string };
type ItemLine = {
  grnItemId?: string;
  itemId: string;
  itemLabel: string;
  uomName: string;
  receivedQty: number;
  previouslyReturnedQty: number;
  availableReturnQty: number;
  returnQty: number;
  unitCost: number;
  reason: string;
  remarks: string;
};

type SupplierReturnEditorProps = {
  documentId?: string;
  documentPublicId?: number;
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  apiBasePath: string;
  cancelHref: string;
  successHref: string;
  canEdit?: boolean;
  suppliers: Option[];
  locations: Option[];
  grnOptions: Option[];
  initialValue: {
    returnDate: string;
    supplierId: string;
    grnId: string;
    returnLocationId: string;
    reason: string;
    remarks: string;
    items: ItemLine[];
  };
};

const fieldGridStyle: React.CSSProperties = {
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
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "10px 12px",
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.surface,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  boxSizing: "border-box",
};

const itemGridHeaderStyle: React.CSSProperties = {
  display: "grid",
  gap: "8px",
  alignItems: "center",
  marginBottom: "10px",
  padding: "0 4px",
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const itemGridScrollStyle: React.CSSProperties = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  paddingBottom: "8px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};


export function SupplierReturnEditor({
  documentId,
  documentPublicId,
  title,
  subtitle,
  breadcrumbs,
  apiBasePath,
  cancelHref,
  successHref,
  canEdit = true,
  suppliers,
  locations,
  grnOptions,
  initialValue,
}: SupplierReturnEditorProps) {
  const router = useRouter();
  const { savingKey, isBusy, submitJson } = useFormSubmit();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    returnDate: initialValue.returnDate,
    supplierId: initialValue.supplierId,
    grnId: initialValue.grnId,
    returnLocationId: initialValue.returnLocationId,
    reason: initialValue.reason,
    remarks: initialValue.remarks,
  });
  const [items, setItems] = useState<ItemLine[]>(initialValue.items);

  function updateItem(index: number, key: keyof ItemLine, value: string | number) {
    setItems((current) =>
      current.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item),
    );
  }

  function save(status: string) {
    setMessage("");
    void submitJson(status, {
      url: documentId ? `${apiBasePath}/${documentId}` : apiBasePath,
      method: documentId ? "PUT" : "POST",
      body: {
        ...header,
        status,
        lineItems: items.map((item) => ({
          grnItemId: item.grnItemId,
          itemId: item.itemId,
          returnQty: Number(item.returnQty ?? 0),
          unitCost: Number(item.unitCost ?? 0),
          reason: item.reason,
          remarks: item.remarks,
        })),
      },
      errorFallback: "Unable to save supplier return",
      successHref: (result) =>
        procurementViewUrl(
          "return",
          Number(result.publicId ?? documentPublicId ?? 0),
        ),
      onError: setMessage,
    });
  }

  const actions: Action[] = [
    { label: "Cancel", variant: "secondary", onClick: () => router.push(cancelHref), disabled: isBusy },
    { label: "Save Draft", variant: "secondary", onClick: () => save("DRAFT"), loading: savingKey === "DRAFT", loadingLabel: "Saving...", disabled: !canEdit },
    { label: "Submit for Approval", variant: "primary", onClick: () => save("SUBMITTED"), loading: savingKey === "SUBMITTED", loadingLabel: "Submitting...", disabled: !canEdit },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />

      <FormCard title="Return Header" variant="teal-header">
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Return Date</label>
            <input type="date" style={inputStyle} value={header.returnDate} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, returnDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Supplier</label>
            <select style={inputStyle} value={header.supplierId} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, supplierId: event.target.value }))}>
              <option value="">Select ...</option>
              {suppliers.map((supplier) => <option key={supplier.value} value={supplier.value}>{supplier.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>GRN Reference</label>
            <select style={inputStyle} value={header.grnId} disabled={!canEdit || Boolean(documentId)} onChange={(event) => setHeader((current) => ({ ...current, grnId: event.target.value }))}>
              <option value="">Select ...</option>
              {grnOptions.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Return Location</label>
            <select style={inputStyle} value={header.returnLocationId} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, returnLocationId: event.target.value }))}>
              <option value="">Select ...</option>
              {locations.map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Reason</label>
            <input style={inputStyle} value={header.reason} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, reason: event.target.value }))} />
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={header.remarks} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
          </div>
        </div>
      </FormCard>

      <FormCard title="Return Items" variant="teal-header">
        <div className="erp-table-scroll" style={itemGridScrollStyle}>
        <div style={{ ...itemGridHeaderStyle, gridTemplateColumns: "2fr repeat(5, 1fr) 2fr 2fr", minWidth: "1080px" }}>
          {["Item", "UOM", "Received", "Prev. Returned", "Available", "Return Qty", "Unit Cost", "Reason"].map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "1080px" }}>
          {items.map((item, index) => (
            <div key={`${item.grnItemId ?? item.itemId}-${index}`}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(5, 1fr) 2fr 2fr", gap: "8px", alignItems: "center" }}>
                <input style={inputStyle} value={item.itemLabel} disabled />
                <input style={inputStyle} value={item.uomName} disabled />
                <FormattedNumberInput style={inputStyle} decimals={0} value={item.receivedQty} disabled />
                <FormattedNumberInput style={inputStyle} decimals={0} value={item.previouslyReturnedQty} disabled />
                <FormattedNumberInput style={inputStyle} decimals={0} value={item.availableReturnQty} disabled />
                <FormattedNumberInput style={inputStyle} decimals={0} value={item.returnQty} disabled={!canEdit} onChange={(nextValue) => updateItem(index, "returnQty", nextValue)} />
                <FormattedNumberInput style={inputStyle} decimals={2} value={item.unitCost} disabled={!canEdit} onChange={(nextValue) => updateItem(index, "unitCost", nextValue)} />
                <input style={inputStyle} value={item.reason} disabled={!canEdit} onChange={(event) => updateItem(index, "reason", event.target.value)} placeholder="Reason" />
              </div>
            </div>
          ))}
        </div>
        </div>
      </FormCard>

      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons actions={actions} />
      </div>
    </div>
  );
}

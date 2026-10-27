"use client";

import { Info } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActionButtons, DataTable, LineItemsGrid, LineItemsGridRow, PageHeader, FormattedNumberInput, SectionHeading, useFormSubmit } from "@/components/shared";
import type { Action, Breadcrumb, Column } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { publicEditUrl } from "@/lib/routing";

type ItemOption = {
  value: string;
  label: string;
  itemCode: string;
  itemName: string;
  uomId: string | null;
  uomName: string | null;
};

type BomLine = {
  componentItemId: string;
  uomId?: string | null;
  quantity: number;
  wastagePercent: number;
  required: boolean;
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.card,
  padding: `${spacing.card.padding}px`,
  minWidth: 0,
  maxWidth: "100%",
};

const fieldGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "18px 28px",
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
  height: 42,
  padding: "0 12px",
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.surface,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  boxSizing: "border-box",
  fontFamily: typography.fontFamily,
};

const addRowWrapStyle: React.CSSProperties = {
  marginTop: "12px",
  display: "flex",
  justifyContent: "flex-end",
};

const bomLineGridTemplate = "minmax(220px, 1.8fr) 140px 120px 110px 88px 36px";

const itemGridHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: bomLineGridTemplate,
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


const addItemButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
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

const requiredMark: React.CSSProperties = { color: "#ef4444", marginLeft: 2 };
const fieldErrorStyle: React.CSSProperties = { color: "#dc2626", fontSize: 12, fontWeight: 600, lineHeight: 1.3 };

function RequiredLabel({ children }: { children: React.ReactNode }) {
  return (
    <label style={labelStyle}>
      {children}
      <span style={requiredMark}>*</span>
    </label>
  );
}

const removeItemButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  minWidth: 28,
  maxWidth: 28,
  height: 28,
  padding: 0,
  borderRadius: 6,
  border: `1px solid ${colors.danger[200]}`,
  backgroundColor: colors.danger[50],
  color: colors.danger[700],
  fontSize: 14,
  fontWeight: 700,
  lineHeight: 1,
  cursor: "pointer",
  justifySelf: "center",
};

export function BomEditor({
  mode,
  documentId,
  title,
  subtitle,
  breadcrumbs,
  apiBasePath,
  cancelHref,
  successHref,
  finishedGoods,
  components,
  units,
  initialValue,
}: {
  mode: "create" | "edit";
  documentId?: string;
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  apiBasePath: string;
  cancelHref: string;
  successHref: string;
  finishedGoods: ItemOption[];
  components: ItemOption[];
  units: Array<{ value: string; label: string }>;
  initialValue: {
    bomName: string;
    finishedGoodId: string;
    outputQty: number;
    uomId: string;
    isDefault: boolean;
    status: string;
    description: string;
    items: BomLine[];
  };
}) {
  const router = useRouter();
  const { savingKey, isBusy, submitJson } = useFormSubmit();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState(initialValue);
  const [items, setItems] = useState<BomLine[]>(
    initialValue.items.length ? initialValue.items : [{ componentItemId: "", uomId: "", quantity: 0, wastagePercent: 0, required: true }],
  );
  const [errors, setErrors] = useState<{
    bomName?: string;
    finishedGoodId?: string;
    outputQty?: string;
    lines: Array<{ material?: string; quantity?: string }>;
  }>({ lines: [] });

  function validateForm() {
    const lines = items.map((line) => ({
      material: line.componentItemId ? undefined : "Material is required",
      quantity: Number(line.quantity) > 0 ? undefined : "Quantity is required",
    }));
    const next = {
      bomName: header.bomName.trim() ? undefined : "BOM name is required",
      finishedGoodId: header.finishedGoodId ? undefined : "Finished good is required",
      outputQty: Number(header.outputQty) > 0 ? undefined : "Output quantity is required",
      lines,
    };
    setErrors(next);
    const lineInvalid = lines.some((line) => line.material || line.quantity);
    return !next.bomName && !next.finishedGoodId && !next.outputQty && !lineInvalid && items.length > 0;
  }

  function updateLine(index: number, key: keyof BomLine, value: string | number | boolean) {
    setItems((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const next = { ...line, [key]: value };
        if (key === "componentItemId") {
          const duplicateIndex = current.findIndex(
            (entry, entryIndex) =>
              entryIndex !== index &&
              entry.componentItemId === String(value) &&
              entry.componentItemId,
          );
          if (duplicateIndex >= 0) {
            setMessage("Use one row per material and increase the quantity instead of repeating the same material.");
            return line;
          }
          const selected = components.find((item) => item.value === String(value));
          next.uomId = selected?.uomId ?? "";
        }
        return next;
      }),
    );
  }

  function addRow() {
    setItems((current) => [...current, { componentItemId: "", uomId: "", quantity: 0, wastagePercent: 0, required: true }]);
    setErrors((current) => ({ ...current, lines: [] }));
  }

  function removeRow(index: number) {
    const blank = { componentItemId: "", uomId: "", quantity: 0, wastagePercent: 0, required: true };
    setItems((current) => blankOrRemoveRow(current, index, blank));
    setErrors((current) => ({
      ...current,
      lines: index === 0
        ? current.lines.map((entry, rowIndex) => (rowIndex === 0 ? {} : entry))
        : current.lines.filter((_, rowIndex) => rowIndex !== index),
    }));
  }

  function syncFinishedGood(finishedGoodId: string) {
    const selected = finishedGoods.find((item) => item.value === finishedGoodId);
    setHeader((current) => ({
      ...current,
      finishedGoodId,
      uomId: current.uomId || selected?.uomId || "",
    }));
  }

  function save() {
    setMessage("");
    if (!validateForm()) return;
    void submitJson("save", {
      url: documentId ? `${apiBasePath}/${documentId}` : apiBasePath,
      method: documentId ? "PUT" : "POST",
      body: { ...header, items },
      errorFallback: "Unable to save BOM",
      successHref: (result) => documentId ? `${successHref}/${documentId}` : `${successHref}/${String(result.id ?? "")}`,
      onError: setMessage,
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />

      <div style={cardStyle}>
        <SectionHeading title="Basic Information" icon={<Info size={16} />} />
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div className="bom-basic-grid" style={fieldGridStyle}>
          <div style={fieldStyle}>
            <RequiredLabel>Finished Good</RequiredLabel>
            <select
              style={errors.finishedGoodId ? { ...inputStyle, borderColor: "#ef4444" } : inputStyle}
              value={header.finishedGoodId}
              onChange={(event) => {
                syncFinishedGood(event.target.value);
                setErrors((current) => ({ ...current, finishedGoodId: undefined }));
              }}
            >
              <option value="">Select ...</option>
              {finishedGoods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
            {errors.finishedGoodId ? <span style={fieldErrorStyle}>{errors.finishedGoodId}</span> : null}
          </div>
          <div style={fieldStyle}>
            <RequiredLabel>BOM Name</RequiredLabel>
            <input
              style={errors.bomName ? { ...inputStyle, borderColor: "#ef4444" } : inputStyle}
              value={header.bomName}
              placeholder="e.g., Creamy Peanut Butter 500 g recipe"
              onChange={(event) => {
                setHeader((current) => ({ ...current, bomName: event.target.value }));
                setErrors((current) => ({ ...current, bomName: undefined }));
              }}
            />
            {errors.bomName ? <span style={fieldErrorStyle}>{errors.bomName}</span> : null}
          </div>
          <div style={{ gridColumn: "1 / -1", display: "flex", flexWrap: "wrap", gap: 16, alignItems: "flex-start" }}>
            <div style={{ ...fieldStyle, width: 160, flex: "0 0 160px" }}>
              <RequiredLabel>Output Quantity</RequiredLabel>
              <FormattedNumberInput
                style={errors.outputQty ? { ...inputStyle, borderColor: "#ef4444" } : inputStyle}
                decimals={0}
                value={header.outputQty}
                onChange={(nextValue) => {
                  setHeader((current) => ({ ...current, outputQty: nextValue }));
                  setErrors((current) => ({ ...current, outputQty: undefined }));
                }}
              />
              {errors.outputQty ? <span style={fieldErrorStyle}>{errors.outputQty}</span> : null}
            </div>
            <div style={{ ...fieldStyle, width: 220, flex: "0 0 220px" }}>
              <label style={labelStyle}>Unit of Measure</label>
              <select
                style={inputStyle}
                value={header.uomId}
                onChange={(event) => setHeader((current) => ({ ...current, uomId: event.target.value }))}
              >
                <option value="">Select UOM...</option>
                {units.map((unit) => <option key={unit.value} value={unit.value}>{unit.label}</option>)}
              </select>
            </div>
            <div style={{ ...fieldStyle, width: 160, flex: "0 0 160px" }}>
              <label style={labelStyle}>Status</label>
              <select style={inputStyle} value={header.status} onChange={(event) => setHeader((current) => ({ ...current, status: event.target.value }))}>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Description</label>
            <textarea
              style={{ ...inputStyle, height: "auto", minHeight: 64, padding: "8px 12px", resize: "vertical" }}
              value={header.description}
              placeholder="Optional description..."
              onChange={(event) => setHeader((current) => ({ ...current, description: event.target.value }))}
            />
          </div>
        </div>
        <style jsx>{`
          @media (max-width: 800px) {
            .bom-basic-grid { grid-template-columns: 1fr !important; }
          }
        `}</style>
      </div>

      <div style={cardStyle}>
        <SectionHeading title="Components" />
        <LineItemsGrid
          template={bomLineGridTemplate}
          alignItems="start"
          headers={[
            <>Material<span style={requiredMark}>*</span></>,
            "UOM",
            <>Quantity<span style={requiredMark}>*</span></>,
            "Wastage %",
            "Required",
            "",
          ]}
          minWidth={720}
        >
          {items.map((line, index) => {
            const selected = components.find((item) => item.value === line.componentItemId);
            const lineError = errors.lines[index];
            return (
              <LineItemsGridRow key={`${line.componentItemId}-${index}`}>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <select
                    style={lineError?.material ? { ...inputStyle, borderColor: "#ef4444" } : inputStyle}
                    value={line.componentItemId}
                    onChange={(event) => {
                      updateLine(index, "componentItemId", event.target.value);
                      setErrors((current) => ({
                        ...current,
                        lines: current.lines.map((entry, entryIndex) => entryIndex === index ? { ...entry, material: undefined } : entry),
                      }));
                    }}
                  >
                    <option value="">Select Material...</option>
                    {components.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                  {lineError?.material ? <span style={fieldErrorStyle}>{lineError.material}</span> : null}
                </div>
                <input style={inputStyle} value={selected?.uomName ?? ""} disabled />
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <FormattedNumberInput
                    style={lineError?.quantity ? { ...inputStyle, borderColor: "#ef4444" } : inputStyle}
                    decimals={3}
                    value={line.quantity}
                    onChange={(nextValue) => {
                      updateLine(index, "quantity", nextValue);
                      setErrors((current) => ({
                        ...current,
                        lines: current.lines.map((entry, entryIndex) => entryIndex === index ? { ...entry, quantity: undefined } : entry),
                      }));
                    }}
                  />
                  {lineError?.quantity ? <span style={fieldErrorStyle}>{lineError.quantity}</span> : null}
                </div>
                <FormattedNumberInput style={inputStyle} decimals={2} value={line.wastagePercent} onChange={(nextValue) => updateLine(index, "wastagePercent", nextValue)} />
                <label style={{ ...inputStyle, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <input type="checkbox" checked={line.required} onChange={(event) => updateLine(index, "required", event.target.checked)} />
                </label>
                <button
                  type="button"
                  style={removeItemButtonStyle}
                  aria-label={index === 0 ? "Clear material row" : `Remove material row ${index + 1}`}
                  title={index === 0 ? "Clear this line" : "Remove this line"}
                  onClick={() => removeRow(index)}
                >
                  ×
                </button>
              </LineItemsGridRow>
            );
          })}
        </LineItemsGrid>
        <div style={addRowWrapStyle}>
          <button type="button" style={addItemButtonStyle} onClick={addRow}>+ Add Item</button>
        </div>
      </div>

      <div style={{ ...cardStyle, display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons
          actions={[
            { label: "Cancel", variant: "secondary", onClick: () => router.push(cancelHref), disabled: isBusy },
            { label: mode === "create" ? "Save BOM" : "Update BOM", variant: "primary", onClick: save, loading: savingKey === "save", loadingLabel: "Saving...", disabled: isBusy },
          ]}
        />
      </div>
    </div>
  );
}

export function BomDetailPage({
  bom,
}: {
  bom: {
    id: string;
    publicId: number;
    bomNo: string;
    bomName: string;
    finishedGoodCode: string;
    finishedGoodName: string;
    outputQty: number;
    uomName: string | null;
    status: string;
    isDefault: boolean;
    description: string | null;
    costEstimate: number;
    items: Array<{
      id: string;
      componentItemCode: string;
      componentItemName: string;
      uomName: string | null;
      quantity: number;
      wastagePercent: number;
      required: boolean;
    }>;
  };
}) {
  const router = useRouter();

  const summaryColumns: Column<Array<{ label: string; value: string }>[number]>[] = [
    { key: "label", label: "Field" },
    { key: "value", label: "Value" },
  ];

  const componentColumns: Column<(typeof bom.items)[number]>[] = [
    { key: "componentItemCode", label: "Code" },
    { key: "componentItemName", label: "Material" },
    { key: "uomName", label: "UOM" },
    { key: "quantity", label: "Quantity" },
    { key: "wastagePercent", label: "Wastage %" },
    { key: "required", label: "Required", render: (value) => (value ? "Yes" : "No") },
  ];

  const summaryRows = [
    { label: "BOM No", value: bom.bomNo },
    { label: "BOM Name", value: bom.bomName },
    { label: "Finished Good", value: `${bom.finishedGoodCode} - ${bom.finishedGoodName}` },
    { label: "Output Qty", value: `${Number(bom.outputQty).toLocaleString()} ${bom.uomName ?? ""}`.trim() },
    { label: "Status", value: bom.status },
    { label: "Default", value: bom.isDefault ? "Yes" : "No" },
    { label: "Planned Material Factor", value: Number(bom.costEstimate).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { label: "Description", value: bom.description ?? "-" },
  ];

  const actions: Action[] = [
    { label: "Edit", variant: "secondary", onClick: () => router.push(publicEditUrl("production.bom", bom.publicId)) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        recordKind="production"
        title={bom.bomName}
        subtitle="BOM header, component detail, and planning context from the live production tables."
        breadcrumbs={[
          { label: "Production", href: "/production" },
          { label: "Bill of Materials", href: "/production/bom" },
          { label: bom.bomNo },
        ]}
        actions={<ActionButtons actions={actions} />}
      />

      <div style={cardStyle}>
        <SectionHeading title="Summary" />
        <DataTable columns={summaryColumns} data={summaryRows} pageSize={10} />
      </div>

      <div style={cardStyle}>
        <SectionHeading title="Components" />
        <DataTable columns={componentColumns} data={bom.items} pageSize={15} />
      </div>
    </div>
  );
}

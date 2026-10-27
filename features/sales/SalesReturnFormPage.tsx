"use client";

import { publicEditUrl, publicPrintUrl, publicViewUrl } from "@/lib/routing/urls";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";

import { ActionButtons, FormCard, PageHeader, useFormSubmit } from "@/components/shared";
import type { Action } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { formatCurrency } from "@/lib/utils/cn";
import type { SaleDetail } from "@/services/sales/sales.service";

type ReturnLine = {
  saleItemId?: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitId?: string;
  uomCode?: string;
  uomName?: string;
  soldQty: number;
  returnQty: number;
  unitPrice: number;
  lineTotal: number;
  reason: string;
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

const headerGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "2fr 1.2fr 1fr 1fr 2fr",
  gap: "8px",
  minWidth: "960px",
  alignItems: "center",
  marginBottom: "10px",
  padding: "0 4px",
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: 700,
  textTransform: "uppercase",
  letterSpacing: "0.04em",
};

const scrollStyle: React.CSSProperties = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  paddingBottom: "8px",
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

function buildLineTotal(quantity: number, unitPrice: number) {
  return Number((quantity * unitPrice).toFixed(2));
}

export function SalesReturnFormPage({
  sale,
  currencyCode,
}: {
  sale: SaleDetail;
  currencyCode: string;
}) {
  const router = useRouter();
  const { savingKey, isBusy, submitJson } = useFormSubmit();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    returnDate: new Date().toISOString().slice(0, 10),
    locationId: sale.locationId,
    customerId: sale.customerId ?? "",
    reason: "",
    remarks: "",
  });
  const [lines, setLines] = useState<ReturnLine[]>(
    sale.items.map((item) => ({
      saleItemId: item.id,
      itemId: item.itemId,
      itemCode: item.itemCode,
      itemName: item.itemName,
      unitId: item.unitId,
      uomCode: item.uomCode,
      uomName: item.uomName,
      soldQty: item.quantity,
      returnQty: 0,
      unitPrice: item.unitPrice,
      lineTotal: 0,
      reason: "",
    })),
  );

  const totalAmount = useMemo(
    () => lines.reduce((sum, line) => sum + line.lineTotal, 0),
    [lines],
  );

  function updateLine(index: number, patch: Partial<ReturnLine>) {
    setLines((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }

        const next = { ...line, ...patch };
        next.lineTotal = buildLineTotal(Number(next.returnQty ?? 0), Number(next.unitPrice ?? 0));
        return next;
      }),
    );
  }

  function save() {
    const selectedLines = lines.filter((line) => Number(line.returnQty ?? 0) > 0);
    if (!selectedLines.length) {
      setMessage("Enter at least one return quantity before posting.");
      return;
    }

    setMessage("");
    void submitJson("save", {
      url: "/api/sales/returns",
      method: "POST",
      body: {
        saleId: sale.id,
        returnDate: header.returnDate,
        locationId: header.locationId,
        customerId: header.customerId || null,
        reason: header.reason || null,
        lines: selectedLines.map((line) => ({
          saleItemId: line.saleItemId,
          itemId: line.itemId,
          unitId: line.unitId,
          quantity: Number(line.returnQty ?? 0),
          unitPrice: Number(line.unitPrice ?? 0),
          reason: line.reason || header.reason || "Sales return",
        })),
      },
      errorFallback: "Unable to post sales return",
      successHref: (result) => {
        const item = result.item as { id?: string } | undefined;
        return publicViewUrl("sales.return", Number(item?.publicId ?? 0));
      },
      onError: setMessage,
    });
  }

  const actions: Action[] = [
    { label: "Cancel", variant: "secondary", onClick: () => router.push(publicViewUrl("sales.sale", sale.publicId)), disabled: isBusy },
    { label: "Post Return", variant: "primary", onClick: save, loading: savingKey === "save", loadingLabel: "Posting..." },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 24, background: "#f8fafc" }}>
      <PageHeader
        title="Create Sales Return"
        subtitle="Return posted sale lines back into inventory using saved sale snapshots"
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Sales History", href: "/sales/history" },
          { label: sale.saleNo, href: `/sales/history/${sale.id}` },
          { label: "Create Return" },
        ]}
      />

      <FormCard title="Return Header" variant="teal-header">
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>Source Sale</label>
            <input style={{ ...inputStyle, background: "#f8fafc" }} value={sale.saleNo} disabled />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Return Date</label>
            <input type="date" style={inputStyle} value={header.returnDate} onChange={(event) => setHeader((current) => ({ ...current, returnDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Return Location</label>
            <input style={{ ...inputStyle, background: "#f8fafc" }} value={`${sale.locationCode} - ${sale.locationName}`} disabled />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Customer</label>
            <input
              style={{ ...inputStyle, background: "#f8fafc" }}
              value={sale.customerCode && sale.customerName ? `${sale.customerCode} - ${sale.customerName}` : "Walk-in customer"}
              disabled
            />
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Reason</label>
            <input style={inputStyle} value={header.reason} onChange={(event) => setHeader((current) => ({ ...current, reason: event.target.value }))} placeholder="Reason for return" />
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: 90, resize: "vertical" }} value={header.remarks} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} placeholder="Optional remarks" />
          </div>
        </div>
      </FormCard>

      <FormCard
        title="Return Lines"
        footer={{
          actions: (
            <div style={{ display: "flex", width: "100%", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
              <strong style={{ color: colors.text.primary }}>
                Return Total: {formatCurrency(totalAmount, currencyCode)}
              </strong>
              <ActionButtons actions={actions} />
            </div>
          ),
        }}
      >
        <div className="erp-table-scroll" style={scrollStyle}>
          <div style={headerGridStyle}>
            {["Item", "UOM", "Sold Qty", "Return Qty", "Reason"].map((label) => (
              <div key={label}>{label}</div>
            ))}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12, minWidth: "960px" }}>
            {lines.map((line, index) => (
              <div key={line.saleItemId ?? `${line.itemId}-${index}`} style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1.2fr 1fr 1fr 2fr", gap: 8, alignItems: "center" }}>
                  <input style={{ ...inputStyle, background: "#f8fafc" }} value={`${line.itemCode} - ${line.itemName}`} disabled />
                  <input style={{ ...inputStyle, background: "#f8fafc" }} value={line.uomCode && line.uomName ? `${line.uomCode} - ${line.uomName}` : line.uomName ?? line.uomCode ?? "UOM"} disabled />
                  <input style={{ ...inputStyle, background: "#f8fafc" }} type="number" value={line.soldQty} disabled />
                  <input
                    style={inputStyle}
                    type="number"
                    min="0"
                    max={line.soldQty}
                    step="1"
                    value={line.returnQty}
                    onChange={(event) => {
                      const value = Number(event.target.value);
                      updateLine(index, {
                        returnQty: Number.isFinite(value) ? Math.min(Math.max(value, 0), line.soldQty) : 0,
                      });
                    }}
                  />
                  <input style={inputStyle} value={line.reason} onChange={(event) => updateLine(index, { reason: event.target.value })} placeholder="Reason" />
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap", color: colors.text.secondary, fontSize: typography.sizes.caption.fontSize }}>
                  <span>Unit Price: {formatCurrency(line.unitPrice, currencyCode)}</span>
                  <span>Line Total: {formatCurrency(line.lineTotal, currencyCode)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </FormCard>
    </div>
  );
}

"use client";

import { publicEditUrl, publicPrintUrl, publicViewUrl } from "@/lib/routing/urls";

import { Fragment, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Eye, FileOutput, Pencil, XCircle } from "lucide-react";

import { ActionButtons, EmptyState, FormCard, FormattedNumberInput, LineItemsGrid, LineItemsGridRow, LineItemsGridSpan, PageHeader, RemarksWithRemoveCell, StatusBadge } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";
import { blankOrRemoveRow } from "@/lib/forms/line-rows";
import { formatCurrency } from "@/lib/utils/cn";
import { formatDecimal } from "@/lib/utils/format-number";
import type { Location } from "@/features/administration/types";
import type { Customer } from "@/features/master-data/types";
import type { SalesQuotationDetail, SalesQuotationSummary } from "@/services/sales/quotation.service";
import type { SalesOrderDetail, SalesOrderSummary } from "@/services/sales/sales-order.service";

type UserOption = {
  value: string;
  label: string;
};

type SaleableItem = {
  id: string;
  itemCode: string;
  itemName: string;
  unitId?: string;
  uomCode?: string;
  uomName?: string;
  label: string;
};

type CommercialLine = {
  id: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  unitId?: string;
  uomCode?: string;
  uomName?: string;
  availableQty: number;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  remarks: string;
  priceListId?: string;
  priceListItemId?: string;
  priceError?: string;
};

type ReferenceData = {
  customers: Customer[];
  locations: Location[];
  salesPeople: UserOption[];
  saleableItems: SaleableItem[];
  currencyCode: string;
  currencyLabel: string;
};

type QuotationFormValue = {
  quotationDate: string;
  expiryDate: string;
  customerId: string;
  channel: string;
  locationId: string;
  salesPersonId: string;
  remarks: string;
  status: string;
  items: CommercialLine[];
};

type SalesOrderFormValue = {
  quotationId: string;
  customerId: string;
  channel: string;
  locationId: string;
  salesPersonId: string;
  paymentTerms: string;
  requiredDeliveryDate: string;
  remarks: string;
  assignedApproverId: string;
  status: string;
  items: CommercialLine[];
};

const shellStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 24,
  padding: 24,
  background: "#f8fafc",
};

const fieldGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: 16,
};

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
};

const labelStyle: React.CSSProperties = {
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.medium,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  border: `1px solid ${colors.inputBorder}`,
  borderRadius: radius.components.input,
  backgroundColor: "#ffffff",
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  boxSizing: "border-box",
};

const readonlyInputStyle: React.CSSProperties = {
  ...inputStyle,
  backgroundColor: "#f8fafc",
};

const tableScrollStyle: React.CSSProperties = {
  overflowX: "auto",
  WebkitOverflowScrolling: "touch",
  paddingBottom: 8,
  width: "100%",
  maxWidth: "100%",
  minWidth: 0,
};

const commercialLineGridTemplate =
  "minmax(220px, 2fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(140px, 1fr) minmax(140px, 1fr) 40px";

const commercialHeaderStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(220px, 2fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(140px, 1fr) minmax(140px, 1fr) minmax(200px, 260px)",
  gap: 12,
  minWidth: 1180,
  padding: "0 4px 10px",
  color: colors.text.secondary,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
};

const commercialRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns:
    "minmax(220px, 2fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(140px, 1fr) minmax(140px, 1fr) minmax(200px, 260px)",
  gap: 12,
  minWidth: 1180,
  alignItems: "center",
};

const addButtonStyle: React.CSSProperties = {
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

const dangerButtonStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 28,
  minWidth: 28,
  maxWidth: 28,
  height: 28,
  padding: 0,
  borderRadius: 6,
  border: "1px solid #fda29b",
  background: "#fef3f2",
  color: "#d92d20",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  justifySelf: "center",
};

const cardGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
  gap: 16,
};

const metricCardStyle: React.CSSProperties = {
  background: "#ffffff",
  borderRadius: 18,
  padding: "18px 20px",
  border: "1px solid #e4e7ec",
  boxShadow: "0 6px 20px rgba(15, 23, 42, 0.04)",
};

const lineInfoStyle: React.CSSProperties = {
  fontSize: typography.sizes.caption.fontSize,
  color: colors.text.secondary,
};

const headerActionLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: 40,
  padding: "0 16px",
  borderRadius: 12,
  textDecoration: "none",
  fontWeight: 700,
};

const listActionLinkStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  width: 34,
  height: 34,
  borderRadius: 10,
  border: `1px solid ${colors.border}`,
  background: "#ffffff",
  color: colors.text.primary,
  textDecoration: "none",
};

function HeaderActions({
  actions,
}: {
  actions: Array<{ label: string; href: string; primary?: boolean }>;
}) {
  return (
    <>
      {actions.map((action) => (
        <Link
          key={`${action.href}-${action.label}`}
          href={action.href}
          style={{
            ...headerActionLinkStyle,
            background: action.primary ? colors.primary[700] : "#ffffff",
            color: action.primary ? "#ffffff" : colors.text.primary,
            border: action.primary ? "none" : `1px solid ${colors.border}`,
          }}
        >
          {action.label}
        </Link>
      ))}
    </>
  );
}

function QuotationWorkflowActions({ id, status }: { id: string; status: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const run = (action: "SENT" | "ACCEPTED" | "REJECTED" | "CONVERT") => {
    setError(null);
    startTransition(async () => {
      const endpoint = action === "CONVERT"
        ? `/api/sales/quotations/${id}/convert-order`
        : `/api/sales/quotations/${id}/status`;
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: action === "CONVERT" ? undefined : JSON.stringify({ status: action }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(payload.error ?? "Unable to update quotation");
        return;
      }
      if (action === "CONVERT") {
        router.push(publicViewUrl("sales.order", payload.item.publicId));
      } else {
        router.refresh();
      }
    });
  };

  return (
    <>
      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "flex-end", gap: 10 }}>
        {status === "DRAFT" ? <button type="button" style={workflowButtonStyle} disabled={isPending} onClick={() => run("SENT")}><FileOutput size={17} /> Send</button> : null}
        {status === "SENT" ? <button type="button" style={workflowButtonStyle} disabled={isPending} onClick={() => run("ACCEPTED")}><CheckCircle2 size={17} /> Accept</button> : null}
        {status === "SENT" ? <button type="button" style={dangerWorkflowButtonStyle} disabled={isPending} onClick={() => run("REJECTED")}><XCircle size={17} /> Reject</button> : null}
        {status === "ACCEPTED" ? <button type="button" style={primaryWorkflowButtonStyle} disabled={isPending} onClick={() => run("CONVERT")}><ArrowRight size={17} /> Create Purchase Order</button> : null}
      </div>
      {error ? <div style={{ color: "#b42318", fontWeight: 600, marginTop: 10 }}>{error}</div> : null}
    </>
  );
}

const workflowButtonStyle: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 8, minHeight: 42, padding: "0 15px",
  borderRadius: 11, border: `1px solid ${colors.border}`, background: "#fff", color: colors.text.primary,
  fontWeight: 700, cursor: "pointer",
};
const primaryWorkflowButtonStyle: React.CSSProperties = { ...workflowButtonStyle, background: colors.primary[700], color: "#fff", border: "none" };
const dangerWorkflowButtonStyle: React.CSSProperties = { ...workflowButtonStyle, color: "#b42318", border: "1px solid #fda29b", background: "#fff5f5" };

function buildBlankLine(): CommercialLine {
  return {
    id: crypto.randomUUID(),
    itemId: "",
    itemCode: "",
    itemName: "",
    unitId: undefined,
    uomCode: undefined,
    uomName: undefined,
    availableQty: 0,
    quantity: 1,
    unitPrice: 0,
    lineTotal: 0,
    remarks: "",
  };
}

function buildUomLabel(item: { uomCode?: string; uomName?: string }) {
  if (item.uomCode && item.uomName) {
    return `${item.uomCode} - ${item.uomName}`;
  }
  return item.uomName || item.uomCode || "UOM";
}

function formatCommercialStatus(status: string) {
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function statusVariant(status: string) {
  switch (String(status).toUpperCase()) {
    case "APPROVED":
    case "COMPLETED":
    case "RESERVED":
    case "LOADED":
    case "CONVERTED":
      return "approved" as const;
    case "PENDING_APPROVAL":
    case "PENDING":
    case "PARTIALLY_RESERVED":
    case "PARTIALLY_LOADED":
    case "PARTIALLY_INVOICED":
    case "SENT":
      return "pending" as const;
    case "REJECTED":
    case "CANCELLED":
    case "EXPIRED":
      return "rejected" as const;
    default:
      return "draft" as const;
  }
}

async function resolveLinePrice(
  params: {
    itemId: string;
    channel: string;
    date: string;
    quantity: number;
    locationId: string;
    customerId?: string;
  },
) {
  const url = new URL("/api/pricing/item-price", window.location.origin);
  url.searchParams.set("itemId", params.itemId);
  url.searchParams.set("channel", params.channel);
  url.searchParams.set("date", params.date);
  url.searchParams.set("quantity", String(params.quantity));
  url.searchParams.set("locationId", params.locationId);
  if (params.customerId) {
    url.searchParams.set("customerId", params.customerId);
  }

  const response = await fetch(url.toString(), { cache: "no-store" });
  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload.error ?? "Failed to resolve price");
  }
  return payload.item as {
    priceListId: string;
    priceListItemId: string;
    unitPrice: number;
    unitId?: string;
    uomCode?: string;
    uomName?: string;
    availableQty?: number;
  };
}

function CommercialLineEditor({
  lines,
  setLines,
  items,
  currencyCode,
  channel,
  documentDate,
  locationId,
  customerId,
  quantityLabel,
}: {
  lines: CommercialLine[];
  setLines: React.Dispatch<React.SetStateAction<CommercialLine[]>>;
  items: SaleableItem[];
  currencyCode: string;
  channel: string;
  documentDate: string;
  locationId: string;
  customerId?: string;
  quantityLabel: string;
}) {
  const [isPending, startTransition] = useTransition();

  const itemMap = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const syncLinePricing = (lineId: string, nextItemId: string, nextQuantity: number) => {
    const selected = itemMap.get(nextItemId);
    if (!selected || !channel || !documentDate || !locationId) {
      return;
    }

    startTransition(async () => {
      try {
        const resolved = await resolveLinePrice({
          itemId: nextItemId,
          channel,
          date: documentDate,
          quantity: nextQuantity,
          locationId,
          customerId,
        });
        setLines((current) =>
          current.map((line) =>
            line.id === lineId
              ? {
                  ...line,
                  itemId: selected.id,
                  itemCode: selected.itemCode,
                  itemName: selected.itemName,
                  unitId: resolved.unitId ?? selected.unitId,
                  uomCode: resolved.uomCode ?? selected.uomCode,
                  uomName: resolved.uomName ?? selected.uomName,
                  availableQty: Number(resolved.availableQty ?? 0),
                  unitPrice: Number(resolved.unitPrice ?? 0),
                  lineTotal: Number((nextQuantity * Number(resolved.unitPrice ?? 0)).toFixed(2)),
                  priceListId: resolved.priceListId,
                  priceListItemId: resolved.priceListItemId,
                  priceError: undefined,
                }
              : line,
          ),
        );
      } catch (error) {
        setLines((current) =>
          current.map((line) =>
            line.id === lineId
              ? {
                  ...line,
                  itemId: selected.id,
                  itemCode: selected.itemCode,
                  itemName: selected.itemName,
                  unitId: selected.unitId,
                  uomCode: selected.uomCode,
                  uomName: selected.uomName,
                  unitPrice: 0,
                  lineTotal: 0,
                  priceListId: undefined,
                  priceListItemId: undefined,
                  priceError: error instanceof Error ? error.message : "Price was not found",
                }
              : line,
          ),
        );
      }
    });
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ fontSize: 14, color: colors.text.secondary }}>
        Prices resolve automatically from the active price list for the selected channel, customer, and location.
      </div>

      <LineItemsGrid
        template={commercialLineGridTemplate}
        headers={["Item", "UOM", "Available", quantityLabel, "Unit Price", "Total", ""]}
        minWidth={1180}
      >
        {lines.map((line, index) => (
          <Fragment key={line.id}>
            <LineItemsGridRow>
              <select
                style={inputStyle}
                value={line.itemId}
                onChange={(event) => {
                  const nextItemId = event.target.value;
                  const selected = itemMap.get(nextItemId);
                  setLines((current) =>
                    current.map((currentLine) =>
                      currentLine.id === line.id
                        ? {
                            ...currentLine,
                            itemId: nextItemId,
                            itemCode: selected?.itemCode ?? "",
                            itemName: selected?.itemName ?? "",
                          }
                        : currentLine,
                    ),
                  );
                  if (nextItemId) {
                    syncLinePricing(line.id, nextItemId, line.quantity);
                  }
                }}
              >
                <option value="">Select ...</option>
                {items.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.label}
                  </option>
                ))}
              </select>

              <input style={readonlyInputStyle} value={buildUomLabel(line)} readOnly />

              <input
                style={readonlyInputStyle}
                value={line.availableQty > 0 ? formatDecimal(line.availableQty) : formatDecimal(0)}
                readOnly
              />

              <FormattedNumberInput
                style={inputStyle}
                decimals={2}
                step={1}
                min={0}
                value={line.quantity}
                onChange={(nextQuantity) => {
                  setLines((current) =>
                    current.map((currentLine) =>
                      currentLine.id === line.id
                        ? {
                            ...currentLine,
                            quantity: nextQuantity,
                            lineTotal: Number((nextQuantity * currentLine.unitPrice).toFixed(2)),
                          }
                        : currentLine,
                    ),
                  );
                  if (line.itemId && nextQuantity > 0) {
                    syncLinePricing(line.id, line.itemId, nextQuantity);
                  }
                }}
              />

              <input style={readonlyInputStyle} value={line.unitPrice ? formatDecimal(line.unitPrice) : ""} readOnly />
              <input style={readonlyInputStyle} value={line.lineTotal ? formatDecimal(line.lineTotal) : ""} readOnly />

              <RemarksWithRemoveCell
                value={line.remarks}
                canRemove
                inputStyle={inputStyle}
                onChange={(next) =>
                  setLines((current) =>
                    current.map((currentLine) =>
                      currentLine.id === line.id ? { ...currentLine, remarks: next } : currentLine,
                    ),
                  )
                }
                onRemove={() =>
                  setLines((current) => blankOrRemoveRow(current, index, buildBlankLine()))
                }
                removeAriaLabel={index === 0 ? "Clear line" : `Remove line item row ${index + 1}`}
              />
            </LineItemsGridRow>

            <LineItemsGridSpan style={lineInfoStyle}>
              {line.priceError
                ? line.priceError
                : line.priceListId
                  ? `Snapshot ready in ${currencyCode}`
                  : line.itemId
                    ? "Resolving active price..."
                    : index === 0 && isPending
                      ? "Resolving active price..."
                      : ""}
            </LineItemsGridSpan>
          </Fragment>
        ))}
      </LineItemsGrid>
      <div style={{ display: "flex", justifyContent: "flex-end" }}>
        <button
          type="button"
          style={addButtonStyle}
          onClick={() => setLines((current) => [...current, buildBlankLine()])}
        >
          + Add Item
        </button>
      </div>
    </div>
  );
}

export function SalesQuotationsListPage({
  items,
  currencyCode,
}: {
  items: SalesQuotationSummary[];
  currencyCode: string;
}) {
  return (
    <div style={shellStyle}>
      <PageHeader
        title="Sales Quotations"
        subtitle="Manage live customer quotations with automatic pricing snapshots."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Quotations" },
        ]}
        actions={<HeaderActions actions={[{ label: "Create Quotation", href: "/sales/quotations/create", primary: true }]} />}
      />

      <div style={cardGridStyle}>
        <div style={metricCardStyle}><div>Draft Quotations</div><strong>{items.filter((item) => item.status === "DRAFT").length}</strong></div>
        <div style={metricCardStyle}><div>Sent</div><strong>{items.filter((item) => item.status === "SENT").length}</strong></div>
        <div style={metricCardStyle}><div>Accepted</div><strong>{items.filter((item) => item.status === "ACCEPTED").length}</strong></div>
        <div style={metricCardStyle}><div>Converted</div><strong>{items.filter((item) => item.status === "CONVERTED").length}</strong></div>
      </div>

      <FormCard title="Quotation Register">
        {!items.length ? (
          <EmptyState title="No quotations yet" message="Create the first customer quotation to start the commercial sales flow." />
        ) : (
          <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
              <thead>
                <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                  <th style={{ padding: "12px 8px" }}>Quotation No</th>
                  <th style={{ padding: "12px 8px" }}>Customer</th>
                  <th style={{ padding: "12px 8px" }}>Channel</th>
                  <th style={{ padding: "12px 8px" }}>Location</th>
                  <th style={{ padding: "12px 8px" }}>Date</th>
                  <th style={{ padding: "12px 8px" }}>Total</th>
                  <th style={{ padding: "12px 8px" }}>Status</th>
                  <th style={{ padding: "12px 8px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderTop: "1px solid #e4e7ec" }}>
                    <td style={{ padding: "14px 8px" }}>{item.quotationNo}</td>
                    <td style={{ padding: "14px 8px" }}>{item.customerCode} - {item.customerName}</td>
                    <td style={{ padding: "14px 8px" }}>{item.channel}</td>
                    <td style={{ padding: "14px 8px" }}>{item.locationCode} - {item.locationName}</td>
                    <td style={{ padding: "14px 8px" }}>{item.quotationDate.slice(0, 10)}</td>
                    <td style={{ padding: "14px 8px" }}>{formatCurrency(item.totalAmount, currencyCode)}</td>
                    <td style={{ padding: "14px 8px" }}><StatusBadge status={statusVariant(item.status)} /></td>
                    <td style={{ padding: "14px 8px" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link href={publicViewUrl("sales.quotation", item.publicId)} style={listActionLinkStyle} title="View quotation" aria-label="View quotation">
                          <Eye size={16} />
                        </Link>
                        <Link href={publicEditUrl("sales.quotation", item.publicId)} style={listActionLinkStyle} title="Edit quotation" aria-label="Edit quotation">
                          <Pencil size={16} />
                        </Link>
                        <Link href={`/sales/orders/create?quotationId=${item.id}`} style={listActionLinkStyle} title="Convert to sales order" aria-label="Convert to sales order">
                          <ArrowRight size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormCard>
    </div>
  );
}

export function SalesQuotationFormPage({
  referenceData,
  initialValue,
  quotationId,
}: {
  referenceData: ReferenceData;
  initialValue?: SalesQuotationDetail;
  quotationId?: string;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<QuotationFormValue>(() => ({
    quotationDate: initialValue?.quotationDate?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
    expiryDate: initialValue?.expiryDate?.slice(0, 10) ?? "",
    customerId: initialValue?.customerId ?? "",
    channel: initialValue?.channel ?? "FACTORY",
    locationId: initialValue?.locationId ?? "",
    salesPersonId: initialValue?.salesPersonId ?? "",
    remarks: initialValue?.remarks ?? "",
    status: initialValue?.status ?? "DRAFT",
    items: initialValue?.items?.length
      ? initialValue.items.map((item) => ({
          id: item.id,
          itemId: item.itemId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          unitId: item.unitId,
          uomCode: item.uomCode,
          uomName: item.uomName,
          availableQty: item.availableQty,
          quantity: item.qty,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          remarks: item.remarks ?? "",
          priceListItemId: item.priceListItemId,
        }))
      : [buildBlankLine()],
  }));

  const submit = (status: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(quotationId ? `/api/sales/quotations/${quotationId}` : "/api/sales/quotations", {
          method: quotationId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...value,
            status,
            items: value.items.map((line) => ({
              id: line.id,
              itemId: line.itemId,
              quantity: line.quantity,
              remarks: line.remarks,
            })),
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to save quotation");
        }
        router.push(publicViewUrl("sales.quotation", payload.item.publicId));
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Failed to save quotation");
      }
    });
  };

  return (
    <div style={shellStyle}>
      <PageHeader
        title={quotationId ? "Edit Quotation" : "Create Quotation"}
        subtitle="Build customer quotations from live finished goods, stock visibility, and channel pricing."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Quotations", href: "/sales/quotations" },
          { label: quotationId ? "Edit" : "Create" },
        ]}
      />

      <FormCard title="Quotation Details">
        <div style={fieldGridStyle}>
          <label style={fieldStyle}><span style={labelStyle}>Quotation Date</span><input style={inputStyle} type="date" value={value.quotationDate} onChange={(event) => setValue((current) => ({ ...current, quotationDate: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Expiry Date</span><input style={inputStyle} type="date" value={value.expiryDate} onChange={(event) => setValue((current) => ({ ...current, expiryDate: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Customer</span><select style={inputStyle} value={value.customerId} onChange={(event) => setValue((current) => ({ ...current, customerId: event.target.value }))}><option value="">Select ...</option>{referenceData.customers.filter((customer) => customer.isActive).map((customer) => <option key={customer.id} value={customer.id}>{customer.customerCode} - {customer.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Channel</span><select style={inputStyle} value={value.channel} onChange={(event) => setValue((current) => ({ ...current, channel: event.target.value }))}><option value="FACTORY">FACTORY</option><option value="BRANCH">BRANCH</option><option value="AGENT">AGENT</option><option value="TRUCK">TRUCK</option></select></label>
          <label style={fieldStyle}><span style={labelStyle}>Location</span><select style={inputStyle} value={value.locationId} onChange={(event) => setValue((current) => ({ ...current, locationId: event.target.value }))}><option value="">Select ...</option>{referenceData.locations.filter((location) => location.isActive).map((location) => <option key={location.id} value={location.id}>{location.locationCode} - {location.locationName}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Sales Person</span><select style={inputStyle} value={value.salesPersonId} onChange={(event) => setValue((current) => ({ ...current, salesPersonId: event.target.value }))}><option value="">Select ...</option>{referenceData.salesPeople.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={fieldStyle}><span style={labelStyle}>Remarks</span><textarea style={{ ...inputStyle, minHeight: 120 }} value={value.remarks} onChange={(event) => setValue((current) => ({ ...current, remarks: event.target.value }))} /></label>
        </div>
      </FormCard>

      <FormCard title="Items">
        <CommercialLineEditor
          lines={value.items}
          setLines={(items) => setValue((current) => ({ ...current, items: typeof items === "function" ? items(current.items) : items }))}
          items={referenceData.saleableItems}
          currencyCode={referenceData.currencyCode}
          channel={value.channel}
          documentDate={value.quotationDate}
          locationId={value.locationId}
          customerId={value.customerId}
          quantityLabel="Quoted Qty"
        />
      </FormCard>

      {error ? <div style={{ color: "#b42318", fontWeight: 600 }}>{error}</div> : null}

      <ActionButtons
        actions={[
          { label: "Cancel", onClick: () => router.push(quotationId ? `/sales/quotations/${quotationId}` : "/sales/quotations"), variant: "secondary" },
          { label: isPending ? "Saving..." : "Save Draft", onClick: () => submit("DRAFT"), variant: "secondary", disabled: isPending },
          { label: isPending ? "Saving..." : "Save & Send", onClick: () => submit("SENT"), variant: "primary", disabled: isPending },
        ]}
      />
    </div>
  );
}

export function SalesQuotationDetailPage({
  item,
  currencyCode,
}: {
  item: SalesQuotationDetail;
  currencyCode: string;
}) {
  return (
    <div style={shellStyle}>
      <PageHeader
        recordKind="sales.sale"
        title={item.quotationNo}
        subtitle="Review the commercial snapshot and convert accepted demand into a sales order."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Quotations", href: "/sales/quotations" },
          { label: item.quotationNo },
        ]}
        actions={<HeaderActions actions={[
          ...(item.status === "DRAFT" || item.status === "SENT" ? [{ label: "Edit", href: publicEditUrl("sales.quotation", item.publicId) }] : []),
          { label: "Print", href: publicPrintUrl("sales.quotation", item.publicId) },
        ]} />}
      />

      <QuotationWorkflowActions id={item.id} status={item.status} />

      <FormCard title="Quotation Header">
        <div style={fieldGridStyle}>
          <div><div style={labelStyle}>Customer</div><div>{item.customerCode} - {item.customerName}</div></div>
          <div><div style={labelStyle}>Channel</div><div>{item.channel}</div></div>
          <div><div style={labelStyle}>Location</div><div>{item.locationCode} - {item.locationName}</div></div>
          <div><div style={labelStyle}>Sales Person</div><div>{item.salesPersonName ?? "—"}</div></div>
          <div><div style={labelStyle}>Quotation Date</div><div>{item.quotationDate.slice(0, 10)}</div></div>
          <div><div style={labelStyle}>Expiry Date</div><div>{item.expiryDate?.slice(0, 10) ?? "—"}</div></div>
          <div><div style={labelStyle}>Status</div><StatusBadge status={statusVariant(item.status)} /></div>
          <div><div style={labelStyle}>Total</div><div>{formatCurrency(item.totalAmount, currencyCode)}</div></div>
        </div>
      </FormCard>

      <FormCard title="Quoted Items">
        <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 980, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                <th style={{ padding: "12px 8px" }}>Item</th>
                <th style={{ padding: "12px 8px" }}>UOM</th>
                <th style={{ padding: "12px 8px" }}>Available</th>
                <th style={{ padding: "12px 8px" }}>Qty</th>
                <th style={{ padding: "12px 8px" }}>Unit Price</th>
                <th style={{ padding: "12px 8px" }}>Total</th>
                <th style={{ padding: "12px 8px" }}>Price List</th>
              </tr>
            </thead>
            <tbody>
              {item.items.map((line) => (
                <tr key={line.id} style={{ borderTop: "1px solid #e4e7ec" }}>
                  <td style={{ padding: "14px 8px" }}>{line.itemCode} - {line.itemName}</td>
                  <td style={{ padding: "14px 8px" }}>{buildUomLabel(line)}</td>
                  <td style={{ padding: "14px 8px" }}>{line.availableQty.toFixed(2)}</td>
                  <td style={{ padding: "14px 8px" }}>{line.qty.toFixed(2)}</td>
                  <td style={{ padding: "14px 8px" }}>{formatCurrency(line.unitPrice, currencyCode)}</td>
                  <td style={{ padding: "14px 8px" }}>{formatCurrency(line.lineTotal, currencyCode)}</td>
                  <td style={{ padding: "14px 8px" }}>{line.priceListCode ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormCard>
    </div>
  );
}

export function SalesOrdersListPage({
  items,
  currencyCode,
}: {
  items: SalesOrderSummary[];
  currencyCode: string;
}) {
  return (
    <div style={shellStyle}>
      <PageHeader
        title="Sales Orders"
        subtitle="Manage approved commercial demand before reservation, loading, invoicing, and returns."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Sales Orders" },
        ]}
        actions={<HeaderActions actions={[{ label: "Create Sales Order", href: "/sales/orders/create", primary: true }]} />}
      />

      <div style={cardGridStyle}>
        <div style={metricCardStyle}><div>Pending Approval</div><strong>{items.filter((item) => item.status === "PENDING_APPROVAL").length}</strong></div>
        <div style={metricCardStyle}><div>Approved</div><strong>{items.filter((item) => item.status === "APPROVED").length}</strong></div>
        <div style={metricCardStyle}><div>Reserved</div><strong>{items.filter((item) => item.status === "RESERVED" || item.status === "PARTIALLY_RESERVED").length}</strong></div>
        <div style={metricCardStyle}><div>Completed</div><strong>{items.filter((item) => item.status === "COMPLETED").length}</strong></div>
      </div>

      <FormCard title="Sales Order Register">
        {!items.length ? (
          <EmptyState title="No sales orders yet" message="Create the first commercial sales order to drive loading, dispatch, and invoicing." />
        ) : (
          <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 1120 }}>
              <thead>
                <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                  <th style={{ padding: "12px 8px" }}>Order No</th>
                  <th style={{ padding: "12px 8px" }}>Customer</th>
                  <th style={{ padding: "12px 8px" }}>Channel</th>
                  <th style={{ padding: "12px 8px" }}>Location</th>
                  <th style={{ padding: "12px 8px" }}>Required Delivery</th>
                  <th style={{ padding: "12px 8px" }}>Total</th>
                  <th style={{ padding: "12px 8px" }}>Status</th>
                  <th style={{ padding: "12px 8px" }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr key={item.id} style={{ borderTop: "1px solid #e4e7ec" }}>
                    <td style={{ padding: "14px 8px" }}>{item.orderNo}</td>
                    <td style={{ padding: "14px 8px" }}>{item.customerCode} - {item.customerName}</td>
                    <td style={{ padding: "14px 8px" }}>{item.channel}</td>
                    <td style={{ padding: "14px 8px" }}>{item.locationCode} - {item.locationName}</td>
                    <td style={{ padding: "14px 8px" }}>{item.requiredDeliveryDate?.slice(0, 10) ?? "—"}</td>
                    <td style={{ padding: "14px 8px" }}>{formatCurrency(item.totalAmount, currencyCode)}</td>
                    <td style={{ padding: "14px 8px" }}><StatusBadge status={statusVariant(item.status)} /></td>
                    <td style={{ padding: "14px 8px" }}>
                      <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
                        <Link href={publicViewUrl("sales.order", item.publicId)} style={listActionLinkStyle} title="View sales order" aria-label="View sales order">
                          <Eye size={16} />
                        </Link>
                        <Link href={publicEditUrl("sales.order", item.publicId)} style={listActionLinkStyle} title="Edit sales order" aria-label="Edit sales order">
                          <Pencil size={16} />
                        </Link>
                        <Link href={`/sales/orders/${item.id}/approve`} style={listActionLinkStyle} title="Approve sales order" aria-label="Approve sales order">
                          <CheckCircle2 size={16} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </FormCard>
    </div>
  );
}

export function SalesOrderFormPage({
  referenceData,
  initialValue,
  salesOrderId,
  quotationSeed,
}: {
  referenceData: ReferenceData;
  initialValue?: SalesOrderDetail;
  salesOrderId?: string;
  quotationSeed?: SalesQuotationDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [value, setValue] = useState<SalesOrderFormValue>(() => ({
    quotationId: initialValue?.quotationId ?? quotationSeed?.id ?? "",
    customerId: initialValue?.customerId ?? quotationSeed?.customerId ?? "",
    channel: initialValue?.channel ?? quotationSeed?.channel ?? "FACTORY",
    locationId: initialValue?.locationId ?? quotationSeed?.locationId ?? "",
    salesPersonId: initialValue?.salesPersonId ?? quotationSeed?.salesPersonId ?? "",
    paymentTerms: initialValue?.paymentTerms ?? "",
    requiredDeliveryDate: initialValue?.requiredDeliveryDate?.slice(0, 10) ?? quotationSeed?.expiryDate?.slice(0, 10) ?? "",
    remarks: initialValue?.remarks ?? quotationSeed?.remarks ?? "",
    assignedApproverId: initialValue?.latestApproval?.assignedApproverId ?? "",
    status: initialValue?.status ?? "DRAFT",
    items: initialValue?.items?.length
      ? initialValue.items.map((item) => ({
          id: item.id,
          itemId: item.itemId,
          itemCode: item.itemCode,
          itemName: item.itemName,
          unitId: item.unitId,
          uomCode: item.uomCode,
          uomName: item.uomName,
          availableQty: item.availableQty,
          quantity: item.orderedQty,
          unitPrice: item.unitPrice,
          lineTotal: item.lineTotal,
          remarks: item.remarks ?? "",
          priceListItemId: item.priceListItemId,
        }))
      : quotationSeed?.items?.length
        ? quotationSeed.items.map((item) => ({
            id: item.id,
            itemId: item.itemId,
            itemCode: item.itemCode,
            itemName: item.itemName,
            unitId: item.unitId,
            uomCode: item.uomCode,
            uomName: item.uomName,
            availableQty: item.availableQty,
            quantity: item.qty,
            unitPrice: item.unitPrice,
            lineTotal: item.lineTotal,
            remarks: item.remarks ?? "",
            priceListItemId: item.priceListItemId,
          }))
      : [buildBlankLine()],
  }));

  const submit = (status: string) => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(salesOrderId ? `/api/sales/orders/${salesOrderId}` : "/api/sales/orders", {
          method: salesOrderId ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...value,
            status,
            items: value.items.map((line) => ({
              id: line.id,
              itemId: line.itemId,
              quantity: line.quantity,
              remarks: line.remarks,
            })),
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to save sales order");
        }
        router.push(publicViewUrl("sales.order", payload.item.publicId));
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Failed to save sales order");
      }
    });
  };

  return (
    <div style={shellStyle}>
      <PageHeader
        title={salesOrderId ? "Edit Sales Order" : "Create Sales Order"}
        subtitle="Build approved customer demand that feeds reservation, loading, dispatch, invoicing, and returns."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Sales Orders", href: "/sales/orders" },
          { label: salesOrderId ? "Edit" : "Create" },
        ]}
      />

      <FormCard title="Sales Order Header">
        <div style={fieldGridStyle}>
          <label style={fieldStyle}><span style={labelStyle}>Customer</span><select style={inputStyle} value={value.customerId} onChange={(event) => setValue((current) => ({ ...current, customerId: event.target.value }))}><option value="">Select ...</option>{referenceData.customers.filter((customer) => customer.isActive).map((customer) => <option key={customer.id} value={customer.id}>{customer.customerCode} - {customer.name}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Channel</span><select style={inputStyle} value={value.channel} onChange={(event) => setValue((current) => ({ ...current, channel: event.target.value }))}><option value="FACTORY">FACTORY</option><option value="BRANCH">BRANCH</option><option value="AGENT">AGENT</option><option value="TRUCK">TRUCK</option></select></label>
          <label style={fieldStyle}><span style={labelStyle}>Location</span><select style={inputStyle} value={value.locationId} onChange={(event) => setValue((current) => ({ ...current, locationId: event.target.value }))}><option value="">Select ...</option>{referenceData.locations.filter((location) => location.isActive).map((location) => <option key={location.id} value={location.id}>{location.locationCode} - {location.locationName}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Sales Person</span><select style={inputStyle} value={value.salesPersonId} onChange={(event) => setValue((current) => ({ ...current, salesPersonId: event.target.value }))}><option value="">Select ...</option>{referenceData.salesPeople.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
          <label style={fieldStyle}><span style={labelStyle}>Payment Terms</span><input style={inputStyle} value={value.paymentTerms} onChange={(event) => setValue((current) => ({ ...current, paymentTerms: event.target.value }))} placeholder="Net 30" /></label>
          <label style={fieldStyle}><span style={labelStyle}>Required Delivery</span><input style={inputStyle} type="date" value={value.requiredDeliveryDate} onChange={(event) => setValue((current) => ({ ...current, requiredDeliveryDate: event.target.value }))} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Assigned Approver</span><select style={inputStyle} value={value.assignedApproverId} onChange={(event) => setValue((current) => ({ ...current, assignedApproverId: event.target.value }))}><option value="">No explicit approver</option>{referenceData.salesPeople.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={fieldStyle}><span style={labelStyle}>Remarks</span><textarea style={{ ...inputStyle, minHeight: 120 }} value={value.remarks} onChange={(event) => setValue((current) => ({ ...current, remarks: event.target.value }))} /></label>
        </div>
      </FormCard>

      <FormCard title="Order Items">
        <CommercialLineEditor
          lines={value.items}
          setLines={(items) => setValue((current) => ({ ...current, items: typeof items === "function" ? items(current.items) : items }))}
          items={referenceData.saleableItems}
          currencyCode={referenceData.currencyCode}
          channel={value.channel}
          documentDate={value.requiredDeliveryDate || new Date().toISOString().slice(0, 10)}
          locationId={value.locationId}
          customerId={value.customerId}
          quantityLabel="Ordered Qty"
        />
      </FormCard>

      {error ? <div style={{ color: "#b42318", fontWeight: 600 }}>{error}</div> : null}

      <ActionButtons
        actions={[
          { label: "Cancel", onClick: () => router.push(salesOrderId ? `/sales/orders/${salesOrderId}` : "/sales/orders"), variant: "secondary" },
          { label: isPending ? "Saving..." : "Save Draft", onClick: () => submit("DRAFT"), variant: "secondary", disabled: isPending },
          { label: isPending ? "Submitting..." : "Submit Order", onClick: () => submit(value.assignedApproverId ? "PENDING_APPROVAL" : "APPROVED"), variant: "primary", disabled: isPending },
        ]}
      />
    </div>
  );
}

export function SalesOrderDetailPage({
  item,
  currencyCode,
}: {
  item: SalesOrderDetail;
  currencyCode: string;
}) {
  const commercialTimeline = [
    ...(item.quotationId ? [{ key: `quotation-${item.quotationId}`, label: "Quotation converted", reference: item.quotationNo ?? "Quotation", date: null as string | null, href: `/sales/quotations/${item.quotationId}`, status: "CONVERTED" }] : []),
    { key: `order-${item.id}`, label: "Sales order", reference: item.orderNo, date: item.requiredDeliveryDate ?? null, href: publicViewUrl("sales.order", item.publicId), status: item.status },
    ...item.relatedLoadingOrders.map((entry) => ({ key: `loading-${entry.id}`, label: "Stock reserved / loading", reference: entry.loadingNo, date: entry.loadingDate, href: publicViewUrl("sales.loading", entry.publicId), status: entry.status })),
    ...item.relatedDispatches.map((entry) => ({ key: `dispatch-${entry.id}`, label: "Goods dispatched", reference: entry.dispatchNo, date: entry.dispatchDate, href: publicViewUrl("sales.dispatch", entry.publicId), status: entry.status })),
    ...item.relatedInvoices.map((entry) => ({ key: `invoice-${entry.id}`, label: "Commercial invoice", reference: entry.invoiceNo, date: entry.invoiceDate, href: publicViewUrl("sales.invoice", entry.publicId), status: entry.status })),
  ].sort((left, right) => String(left.date ?? "").localeCompare(String(right.date ?? "")));

  return (
    <div style={shellStyle}>
      <PageHeader
        recordKind="sales.sale"
        title={item.orderNo}
        subtitle="Review the commercial master document that drives reservation, loading, invoicing, and returns."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Sales Orders", href: "/sales/orders" },
          { label: item.orderNo },
        ]}
        actions={<HeaderActions actions={[
          ...(["DRAFT", "PENDING_APPROVAL", "APPROVED"].includes(item.status) ? [{ label: "Edit", href: publicEditUrl("sales.order", item.publicId) }] : []),
          ...(item.approvalStatus === "PENDING" ? [{ label: "Approve", href: `/sales/orders/${item.id}/approve` }] : []),
          ...(["APPROVED", "PARTIALLY_RESERVED", "RESERVED", "PARTIALLY_LOADED"].includes(item.status) ? [{ label: "Reserve / Load", href: `/sales/orders/${item.id}/convert-loading` }] : []),
          ...(!["DRAFT", "PENDING_APPROVAL", "CANCELLED", "COMPLETED", "INVOICED"].includes(item.status) ? [{ label: "Create Invoice", href: `/sales/orders/${item.id}/convert-invoice`, primary: true }] : []),
          { label: "Print", href: publicPrintUrl("sales.order", item.publicId) },
          ...(!["CANCELLED", "COMPLETED", "INVOICED"].includes(item.status) ? [{ label: "Cancel", href: `/sales/orders/${item.id}/cancel` }] : []),
        ]} />}
      />

      <FormCard title="Order Header">
        <div style={fieldGridStyle}>
          <div><div style={labelStyle}>Customer</div><div>{item.customerCode} - {item.customerName}</div></div>
          <div><div style={labelStyle}>Channel</div><div>{item.channel}</div></div>
          <div><div style={labelStyle}>Location</div><div>{item.locationCode} - {item.locationName}</div></div>
          <div><div style={labelStyle}>Sales Person</div><div>{item.salesPersonName ?? "—"}</div></div>
          <div><div style={labelStyle}>Payment Terms</div><div>{item.paymentTerms ?? "—"}</div></div>
          <div><div style={labelStyle}>Required Delivery</div><div>{item.requiredDeliveryDate?.slice(0, 10) ?? "—"}</div></div>
          <div><div style={labelStyle}>Status</div><StatusBadge status={statusVariant(item.status)} /></div>
          <div><div style={labelStyle}>Approval</div><StatusBadge status={statusVariant(item.approvalStatus)} /></div>
        </div>
      </FormCard>

      <FormCard title="Order Items">
        <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", minWidth: 1200, borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: colors.text.secondary }}>
                <th style={{ padding: "12px 8px" }}>Item</th>
                <th style={{ padding: "12px 8px" }}>UOM</th>
                <th style={{ padding: "12px 8px" }}>Available</th>
                <th style={{ padding: "12px 8px" }}>Ordered</th>
                <th style={{ padding: "12px 8px" }}>Reserved</th>
                <th style={{ padding: "12px 8px" }}>Loaded</th>
                <th style={{ padding: "12px 8px" }}>Dispatched</th>
                <th style={{ padding: "12px 8px" }}>Invoiced</th>
                <th style={{ padding: "12px 8px" }}>Returned</th>
                <th style={{ padding: "12px 8px" }}>Remaining</th>
                <th style={{ padding: "12px 8px" }}>Unit Price</th>
                <th style={{ padding: "12px 8px" }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {item.items.map((line) => (
                <tr key={line.id} style={{ borderTop: "1px solid #e4e7ec" }}>
                  <td style={{ padding: "14px 8px" }}>{line.itemCode} - {line.itemName}</td>
                  <td style={{ padding: "14px 8px" }}>{buildUomLabel(line)}</td>
                  <td style={{ padding: "14px 8px" }}>{line.availableQty.toFixed(2)}</td>
                  <td style={{ padding: "14px 8px" }}>{line.orderedQty.toFixed(2)}</td>
                  <td style={{ padding: "14px 8px" }}>{line.reservedQty.toFixed(2)}</td>
                  <td style={{ padding: "14px 8px" }}>{line.loadedQty.toFixed(2)}</td>
                  <td style={{ padding: "14px 8px" }}>{line.dispatchedQty.toFixed(2)}</td>
                  <td style={{ padding: "14px 8px" }}>{line.invoicedQty.toFixed(2)}</td>
                  <td style={{ padding: "14px 8px" }}>{line.returnedQty.toFixed(2)}</td>
                  <td style={{ padding: "14px 8px" }}>{line.remainingQty.toFixed(2)}</td>
                  <td style={{ padding: "14px 8px" }}>{formatCurrency(line.unitPrice, currencyCode)}</td>
                  <td style={{ padding: "14px 8px" }}>{formatCurrency(line.lineTotal, currencyCode)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </FormCard>

      <FormCard title="Commercial Timeline">
        <div style={{ display: "grid", gap: 10 }}>
          {commercialTimeline.map((event, index) => (
            <div key={event.key} style={{ display: "grid", gridTemplateColumns: "34px minmax(0, 1fr) auto", alignItems: "center", gap: 12, padding: "12px 0", borderTop: index ? "1px solid #eaecf0" : "none" }}>
              <div style={{ width: 30, height: 30, borderRadius: 999, display: "grid", placeItems: "center", background: "#ccfbf1", color: "#0f766e", fontWeight: 800 }}>{index + 1}</div>
              <div><div style={{ fontWeight: 750 }}>{event.label}</div><Link href={event.href} style={{ color: colors.primary[700], textDecoration: "none" }}>{event.reference}</Link></div>
              <div style={{ textAlign: "right" }}><StatusBadge status={statusVariant(event.status)} />{event.date ? <div style={{ marginTop: 5, color: colors.text.secondary, fontSize: 13 }}>{event.date.slice(0, 10)}</div> : null}</div>
            </div>
          ))}
        </div>
      </FormCard>

      <FormCard title="Downstream Usage">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          <div>
            <h4 style={{ margin: "0 0 12px" }}>Loading Orders</h4>
            {item.relatedLoadingOrders.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {item.relatedLoadingOrders.map((loading) => (
                  <li key={loading.id}><Link href={publicViewUrl("sales.loading", loading.publicId)}>{loading.loadingNo}</Link> • {formatCommercialStatus(loading.status)}</li>
                ))}
              </ul>
            ) : <div style={lineInfoStyle}>No loading orders created yet.</div>}
          </div>
          <div>
            <h4 style={{ margin: "0 0 12px" }}>Dispatches</h4>
            {item.relatedDispatches.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {item.relatedDispatches.map((dispatch) => (
                  <li key={dispatch.id}>
                    <Link href={publicViewUrl("sales.dispatch", dispatch.publicId)}>{dispatch.dispatchNo}</Link> • {formatCommercialStatus(dispatch.status)}
                    {dispatch.loadingNo ? ` • ${dispatch.loadingNo}` : ""}
                  </li>
                ))}
              </ul>
            ) : <div style={lineInfoStyle}>No dispatches created yet.</div>}
          </div>
          <div>
            <h4 style={{ margin: "0 0 12px" }}>Invoices</h4>
            {item.relatedInvoices.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {item.relatedInvoices.map((invoice) => (
                  <li key={invoice.id}>
                    <Link href={publicViewUrl("sales.invoice", invoice.publicId)}>{invoice.invoiceNo}</Link> • {formatCommercialStatus(invoice.status)}
                    {invoice.dispatchNo ? ` • ${invoice.dispatchNo}` : ""}
                  </li>
                ))}
              </ul>
            ) : <div style={lineInfoStyle}>No invoices created yet.</div>}
          </div>
          <div>
            <h4 style={{ margin: "0 0 12px" }}>Posted Sales</h4>
            {item.relatedSales.length ? (
              <ul style={{ margin: 0, paddingLeft: 18 }}>
                {item.relatedSales.map((sale) => (
                  <li key={sale.id}><Link href={publicViewUrl("sales.sale", sale.publicId)}>{sale.saleNo}</Link> • {sale.paymentStatus}</li>
                ))}
              </ul>
            ) : <div style={lineInfoStyle}>No posted sale records yet.</div>}
          </div>
        </div>
      </FormCard>
    </div>
  );
}

export function SalesOrderCancelPage({ item }: { item: SalesOrderDetail }) {
  const router = useRouter();
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const submit = () => {
    setError(null);
    startTransition(async () => {
      const response = await fetch(`/api/sales/orders/${item.id}/cancel`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ reason }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) return setError(payload.error ?? "Unable to cancel sales order");
      router.push(publicViewUrl("sales.order", item.publicId));
      router.refresh();
    });
  };

  return <div style={shellStyle}>
    <PageHeader title={`Cancel ${item.orderNo}`} subtitle="Cancellation is audited and only allowed after active loading reservations are released." breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Sales Orders", href: "/sales/orders" }, { label: item.orderNo, href: publicViewUrl("sales.order", item.publicId) }, { label: "Cancel" }]} />
    <FormCard title="Cancellation Reason">
      <label style={fieldStyle}><span style={labelStyle}>Reason</span><textarea style={{ ...inputStyle, minHeight: 130 }} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Explain why this order is being cancelled" /></label>
      {error ? <div style={{ color: "#b42318", fontWeight: 600, marginTop: 12 }}>{error}</div> : null}
    </FormCard>
    <ActionButtons actions={[{ label: "Back", onClick: () => router.push(publicViewUrl("sales.order", item.publicId)), variant: "secondary" }, { label: isPending ? "Cancelling..." : "Cancel Sales Order", onClick: submit, variant: "danger", disabled: isPending || !reason.trim() }]} />
  </div>;
}

export function SalesOrderApprovalPage({
  item,
}: {
  item: SalesOrderDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (action: "approve" | "reject") => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/sales/orders/${item.id}/approve`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, comment }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to update approval");
        }
        router.push(publicViewUrl("sales.order", item.publicId));
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Failed to update approval");
      }
    });
  };

  return (
    <div style={shellStyle}>
      <PageHeader
        title={`Approve ${item.orderNo}`}
        subtitle="Review the order and move it into approved commercial demand or send it back."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Sales Orders", href: "/sales/orders" },
          { label: item.orderNo, href: publicViewUrl("sales.order", item.publicId) },
          { label: "Approval" },
        ]}
      />

      <FormCard title="Approval Decision">
        <div style={{ marginBottom: 16 }}>
          Current status: <StatusBadge status={statusVariant(item.status)} />
        </div>
        <label style={fieldStyle}>
          <span style={labelStyle}>Comment</span>
          <textarea style={{ ...inputStyle, minHeight: 140 }} value={comment} onChange={(event) => setComment(event.target.value)} />
        </label>
      </FormCard>

      {error ? <div style={{ color: "#b42318", fontWeight: 600 }}>{error}</div> : null}

      <ActionButtons
        actions={[
          { label: "Back", onClick: () => router.push(publicViewUrl("sales.order", item.publicId)), variant: "secondary" },
          { label: isPending ? "Rejecting..." : "Reject", onClick: () => submit("reject"), variant: "danger", disabled: isPending },
          { label: isPending ? "Approving..." : "Approve", onClick: () => submit("approve"), variant: "primary", disabled: isPending },
        ]}
      />
    </div>
  );
}

export function SalesOrderConvertLoadingPage({
  item,
}: {
  item: SalesOrderDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [loadingDate, setLoadingDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState("");

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/sales/orders/${item.id}/convert-loading`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ loadingDate, remarks }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to create loading order");
        }
        router.push(publicViewUrl("sales.loading", payload.item.publicId));
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Failed to create loading order");
      }
    });
  };

  return (
    <div style={shellStyle}>
      <PageHeader
        title={`Create Loading from ${item.orderNo}`}
        subtitle="Reserve stock directly from the approved order and carry its commercial price snapshot forward."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Sales Orders", href: "/sales/orders" },
          { label: item.orderNo, href: publicViewUrl("sales.order", item.publicId) },
          { label: "Convert to Loading" },
        ]}
      />
      <FormCard title="Loading Reservation">
        <div style={fieldGridStyle}>
          <label style={fieldStyle}><span style={labelStyle}>Loading Date</span><input style={inputStyle} type="date" value={loadingDate} onChange={(event) => setLoadingDate(event.target.value)} /></label>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={fieldStyle}><span style={labelStyle}>Remarks</span><textarea style={{ ...inputStyle, minHeight: 120 }} value={remarks} onChange={(event) => setRemarks(event.target.value)} /></label>
        </div>
      </FormCard>
      {error ? <div style={{ color: "#b42318", fontWeight: 600 }}>{error}</div> : null}
      <ActionButtons actions={[{ label: "Back", onClick: () => router.push(publicViewUrl("sales.order", item.publicId)), variant: "secondary" }, { label: isPending ? "Creating..." : "Reserve & Create Loading", onClick: submit, variant: "primary", disabled: isPending }]} />
    </div>
  );
}

export function SalesOrderConvertInvoicePage({
  item,
}: {
  item: SalesOrderDetail;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saleDate, setSaleDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("");
  const [referenceNo, setReferenceNo] = useState("");
  const [notes, setNotes] = useState("");

  const submit = () => {
    setError(null);
    startTransition(async () => {
      try {
        const response = await fetch(`/api/sales/orders/${item.id}/convert-invoice`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            saleDate,
            paymentMethod: paymentMethod || null,
            referenceNo,
            notes,
          }),
        });
        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload.error ?? "Failed to create invoice");
        }
        router.push(publicViewUrl("sales.invoice", payload.item.publicId));
        router.refresh();
      } catch (submitError) {
        setError(submitError instanceof Error ? submitError.message : "Failed to create invoice");
      }
    });
  };

  return (
    <div style={shellStyle}>
      <PageHeader
        title={`Create Invoice from ${item.orderNo}`}
        subtitle="Issue stock and create the posted sales document from the saved order snapshot."
        breadcrumbs={[
          { label: "Sales", href: "/sales" },
          { label: "Sales Orders", href: "/sales/orders" },
          { label: item.orderNo, href: publicViewUrl("sales.order", item.publicId) },
          { label: "Convert to Invoice" },
        ]}
      />
      <FormCard title="Invoice Posting">
        <div style={fieldGridStyle}>
          <label style={fieldStyle}><span style={labelStyle}>Sale Date</span><input style={inputStyle} type="date" value={saleDate} onChange={(event) => setSaleDate(event.target.value)} /></label>
          <label style={fieldStyle}><span style={labelStyle}>Payment Method</span><select style={inputStyle} value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)}><option value="">Leave Unpaid</option><option value="CASH">CASH</option><option value="BANK">BANK</option><option value="CHEQUE">CHEQUE</option><option value="MOBILE_MONEY">MOBILE MONEY</option></select></label>
          <label style={fieldStyle}><span style={labelStyle}>Reference No</span><input style={inputStyle} value={referenceNo} onChange={(event) => setReferenceNo(event.target.value)} /></label>
        </div>
        <div style={{ marginTop: 16 }}>
          <label style={fieldStyle}><span style={labelStyle}>Notes</span><textarea style={{ ...inputStyle, minHeight: 120 }} value={notes} onChange={(event) => setNotes(event.target.value)} /></label>
        </div>
      </FormCard>
      {error ? <div style={{ color: "#b42318", fontWeight: 600 }}>{error}</div> : null}
      <ActionButtons actions={[{ label: "Back", onClick: () => router.push(publicViewUrl("sales.order", item.publicId)), variant: "secondary" }, { label: isPending ? "Posting..." : "Post Invoice", onClick: submit, variant: "primary", disabled: isPending }]} />
    </div>
  );
}

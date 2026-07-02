"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  ActionButtons,
  DataTable,
  EmptyState,
  FormCard,
  PageHeader,
  SearchInput,
} from "@/components/shared";
import type { Action, Breadcrumb, Column, TableAction } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";

type Option = { value: string; label: string };

type GoodsReceiptListRow = {
  id: string;
  number: string;
  date: string;
  status: string;
  poNo: string;
  supplierName: string;
  locationName: string;
  itemCount: number;
  totalAmount: number;
};

type GoodsReceiptEditorLine = {
  poItemId?: string;
  itemId: string;
  itemLabel: string;
  uomId?: string;
  uomName: string;
  orderedQty: number;
  previouslyReceivedQty: number;
  remainingQty: number;
  receivedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  unitCost: number;
  taxAmount: number;
  remarks: string;
};

type GoodsReceiptEditorProps = {
  documentId?: string;
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  apiBasePath: string;
  cancelHref: string;
  successHref: string;
  canEdit?: boolean;
  suppliers: Option[];
  locations: Option[];
  users: Option[];
  purchaseOrders: Option[];
  initialValue: {
    grnDate: string;
    poId: string;
    supplierId: string;
    receivingLocationId: string;
    deliveryNoteNo: string;
    supplierInvoiceNo: string;
    vehiclePlate: string;
    deliveredBy: string;
    receivedById: string;
    remarks: string;
    approverId?: string;
    items: GoodsReceiptEditorLine[];
  };
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.card,
  padding: `${spacing.card.padding}px`,
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
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.input,
  backgroundColor: colors.surface,
  fontSize: typography.sizes.body.fontSize,
  color: colors.text.primary,
  boxSizing: "border-box",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value));
}

function statusBadge(status: string) {
  const normalized = status.toUpperCase();
  const background =
    normalized === "POSTED" || normalized === "APPROVED"
      ? colors.success[50]
      : normalized === "REJECTED" || normalized === "CANCELLED"
        ? colors.danger[50]
        : colors.warning[50];
  const text =
    normalized === "POSTED" || normalized === "APPROVED"
      ? colors.success[700]
      : normalized === "REJECTED" || normalized === "CANCELLED"
        ? colors.danger[700]
        : colors.warning[700];

  return (
    <span style={{ padding: "4px 10px", borderRadius: 999, backgroundColor: background, color: text, fontSize: typography.sizes.caption.fontSize, fontWeight: typography.weights.medium }}>
      {status}
    </span>
  );
}

export function GoodsReceiptListPage({ rows }: { rows: GoodsReceiptListRow[] }) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.number, row.poNo, row.supplierName, row.locationName, row.status].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [rows, search]);

  const columns: Column<GoodsReceiptListRow>[] = [
    { key: "number", label: "GRN No", sortable: true },
    { key: "date", label: "Date", render: (value) => formatDate(String(value)) },
    { key: "poNo", label: "PO No" },
    { key: "supplierName", label: "Supplier" },
    { key: "locationName", label: "Receiving Location" },
    { key: "itemCount", label: "Items" },
    { key: "totalAmount", label: "Total Amount", render: (value) => Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 }) },
    { key: "status", label: "Status", render: (value) => statusBadge(String(value)) },
  ];

  const actions: TableAction[] = [
    { label: "View", onClick: (record) => { window.location.href = `/procurement/grn/${(record as GoodsReceiptListRow).id}`; } },
    { label: "Edit", onClick: (record) => { window.location.href = `/procurement/grn/${(record as GoodsReceiptListRow).id}/edit`; } },
  ];

  const headerActions: Action[] = [
    { label: "Create GRN", variant: "primary", onClick: () => { window.location.href = "/procurement/grn/create"; } },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Goods Receipts / GRN"
        subtitle="Receive approved purchase order lines into inventory with accepted and rejected quantity control."
        breadcrumbs={[{ label: "Procurement", href: "/procurement" }, { label: "Goods Receipts / GRN" }]}
        actions={<ActionButtons actions={headerActions} />}
      />
      <div style={cardStyle}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search GRN number, PO number, supplier, or location..." />
      </div>
      <DataTable columns={columns} data={filtered} actions={actions} pageSize={15} emptyState={<EmptyState title="No Goods Receipts" message="Create the first GRN to receive approved purchase orders into inventory." />} />
    </div>
  );
}

export function GoodsReceiptEditor({
  documentId,
  title,
  subtitle,
  breadcrumbs,
  apiBasePath,
  cancelHref,
  successHref,
  canEdit = true,
  suppliers,
  locations,
  users,
  purchaseOrders,
  initialValue,
}: GoodsReceiptEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    grnDate: initialValue.grnDate,
    poId: initialValue.poId,
    supplierId: initialValue.supplierId,
    receivingLocationId: initialValue.receivingLocationId,
    deliveryNoteNo: initialValue.deliveryNoteNo,
    supplierInvoiceNo: initialValue.supplierInvoiceNo,
    vehiclePlate: initialValue.vehiclePlate,
    deliveredBy: initialValue.deliveredBy,
    receivedById: initialValue.receivedById,
    remarks: initialValue.remarks,
    approverId: initialValue.approverId ?? "",
  });
  const [lineItems, setLineItems] = useState<GoodsReceiptEditorLine[]>(initialValue.items);

  async function loadPrefill(poId: string) {
    if (!poId) return;
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/procurement/grn/prefill?poId=${encodeURIComponent(poId)}`);
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to load purchase order lines");
        return;
      }

      setHeader((current) => ({
        ...current,
        poId,
        supplierId: result.header.supplierId,
        receivingLocationId: result.header.deliveryLocationId,
      }));
      setLineItems(result.items.map((item: Record<string, unknown>) => ({
        poItemId: String(item.poItemId),
        itemId: String(item.itemId),
        itemLabel: `${String(item.itemCode)} - ${String(item.itemName)}`,
        uomId: item.uomId ? String(item.uomId) : undefined,
        uomName: String(item.uomName ?? ""),
        orderedQty: Number(item.orderedQty ?? 0),
        previouslyReceivedQty: Number(item.previouslyReceivedQty ?? 0),
        remainingQty: Number(item.remainingQty ?? 0),
        receivedQty: Number(item.remainingQty ?? 0),
        acceptedQty: Number(item.remainingQty ?? 0),
        rejectedQty: 0,
        unitCost: Number(item.unitCost ?? 0),
        taxAmount: Number(item.taxAmount ?? 0),
        remarks: "",
      })));
    });
  }

  function updateLine(index: number, key: keyof GoodsReceiptEditorLine, value: string | number) {
    setLineItems((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const next = { ...line, [key]: value };
        if (key === "receivedQty") {
          next.acceptedQty = Number(value);
          next.rejectedQty = 0;
        }
        if (key === "acceptedQty") {
          next.rejectedQty = Math.max(Number(next.receivedQty ?? 0) - Number(value), 0);
        }
        if (key === "rejectedQty") {
          next.acceptedQty = Math.max(Number(next.receivedQty ?? 0) - Number(value), 0);
        }
        return next;
      }),
    );
  }

  function save(status: string) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(documentId ? `${apiBasePath}/${documentId}` : apiBasePath, {
        method: documentId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...header,
          status,
          lineItems: lineItems.map((line) => ({
            poItemId: line.poItemId,
            itemId: line.itemId,
            uomId: line.uomId,
            orderedQty: line.orderedQty,
            previouslyReceivedQty: line.previouslyReceivedQty,
            receivedQty: line.receivedQty,
            acceptedQty: line.acceptedQty,
            rejectedQty: line.rejectedQty,
            unitCost: line.unitCost,
            taxAmount: line.taxAmount,
            remarks: line.remarks,
          })),
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to save goods receipt");
        return;
      }
      router.push(documentId ? `${successHref}/${documentId}` : `${successHref}/${result.id}`);
      router.refresh();
    });
  }

  const actions: Action[] = [
    { label: "Cancel", variant: "secondary", onClick: () => router.push(cancelHref), disabled: isPending },
    { label: "Save Draft", variant: "secondary", onClick: () => save("DRAFT"), loading: isPending, disabled: !canEdit },
    { label: "Submit", variant: "primary", onClick: () => save("SUBMITTED"), loading: isPending, disabled: !canEdit },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />

      <FormCard title="Receipt Header" variant="teal-header">
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>GRN Date</label>
            <input type="date" style={inputStyle} value={header.grnDate} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, grnDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>PO Reference</label>
            <select style={inputStyle} value={header.poId} disabled={!canEdit || Boolean(documentId)} onChange={(event) => void loadPrefill(event.target.value)}>
              <option value="">Select purchase order</option>
              {purchaseOrders.map((po) => <option key={po.value} value={po.value}>{po.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Supplier</label>
            <select style={inputStyle} value={header.supplierId} disabled>
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => <option key={supplier.value} value={supplier.value}>{supplier.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Receiving Location</label>
            <select style={inputStyle} value={header.receivingLocationId} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, receivingLocationId: event.target.value }))}>
              <option value="">Select location</option>
              {locations.map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Delivery Note No</label>
            <input style={inputStyle} value={header.deliveryNoteNo} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, deliveryNoteNo: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Supplier Invoice No</label>
            <input style={inputStyle} value={header.supplierInvoiceNo} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, supplierInvoiceNo: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Vehicle Plate</label>
            <input style={inputStyle} value={header.vehiclePlate} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, vehiclePlate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Delivered By</label>
            <input style={inputStyle} value={header.deliveredBy} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, deliveredBy: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Received By</label>
            <select style={inputStyle} value={header.receivedById} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, receivedById: event.target.value }))}>
              <option value="">Select user</option>
              {users.map((user) => <option key={user.value} value={user.value}>{user.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Assigned Approver</label>
            <select style={inputStyle} value={header.approverId} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, approverId: event.target.value }))}>
              <option value="">No explicit approver</option>
              {users.map((user) => <option key={user.value} value={user.value}>{user.label}</option>)}
            </select>
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={header.remarks} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
          </div>
        </div>
      </FormCard>

      <FormCard title="Received Items" variant="teal-header">
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {lineItems.length === 0 ? (
            <p style={{ margin: 0, color: colors.text.secondary }}>Select an approved purchase order to load receivable lines.</p>
          ) : null}
          {lineItems.map((line, index) => (
            <div key={`${line.poItemId ?? line.itemId}-${index}`} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div style={{ display: "grid", gridTemplateColumns: "2fr repeat(7, 1fr) 2fr", gap: "8px", alignItems: "center" }}>
                <input style={inputStyle} value={line.itemLabel} disabled />
                <input style={inputStyle} value={line.uomName} disabled />
                <input style={inputStyle} type="number" value={line.orderedQty} disabled />
                <input style={inputStyle} type="number" value={line.previouslyReceivedQty} disabled />
                <input style={inputStyle} type="number" value={line.remainingQty} disabled />
                <input style={inputStyle} type="number" value={line.receivedQty} disabled={!canEdit} onChange={(event) => updateLine(index, "receivedQty", Number(event.target.value))} />
                <input style={inputStyle} type="number" value={line.acceptedQty} disabled={!canEdit} onChange={(event) => updateLine(index, "acceptedQty", Number(event.target.value))} />
                <input style={inputStyle} type="number" value={line.rejectedQty} disabled={!canEdit} onChange={(event) => updateLine(index, "rejectedQty", Number(event.target.value))} />
                <input style={inputStyle} type="number" value={line.unitCost} disabled={!canEdit} onChange={(event) => updateLine(index, "unitCost", Number(event.target.value))} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: "8px" }}>
                <input style={inputStyle} type="number" value={line.taxAmount} disabled={!canEdit} onChange={(event) => updateLine(index, "taxAmount", Number(event.target.value))} placeholder="Tax Amount" />
                <input style={inputStyle} value={line.remarks} disabled={!canEdit} onChange={(event) => updateLine(index, "remarks", event.target.value)} placeholder="Remarks" />
              </div>
            </div>
          ))}
        </div>
      </FormCard>

      <div style={{ ...cardStyle, display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons actions={actions} />
      </div>
    </div>
  );
}

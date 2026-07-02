"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import {
  ActionButtons,
  DataTable,
  EmptyState,
  PageHeader,
  SearchInput,
  StatusBadge,
} from "@/components/shared";
import type { Action, Breadcrumb, Column, TableAction } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";

export type InventoryDocumentKind =
  | "transfer"
  | "adjustment"
  | "issue"
  | "return"
  | "requisition";

export interface Option {
  label: string;
  value: string;
}

export interface ItemOption extends Option {
  itemCode: string;
  itemName: string;
  uom?: string;
  unitCost?: number;
}

export interface InventoryDocumentListRow {
  id: string;
  number: string;
  date: string;
  status: string;
  itemCount: number;
  primaryText: string;
  secondaryText?: string;
  ownerText?: string;
}

export interface InventoryDocumentListPageProps {
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  createHref: string;
  rows: InventoryDocumentListRow[];
  searchPlaceholder: string;
  primaryColumnLabel: string;
  secondaryColumnLabel?: string;
  ownerColumnLabel?: string;
  baseHref: string;
}

type EditableLine = {
  itemId: string;
  quantity?: number;
  unitCost?: number;
  remarks?: string;
  systemQty?: number;
  physicalQty?: number;
  differenceQty?: number;
  requestedQty?: number;
  approvedQty?: number;
  issuedQty?: number;
};

interface InventoryDocumentEditorProps {
  kind: InventoryDocumentKind;
  mode: "create" | "edit";
  documentId?: string;
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  apiBasePath: string;
  cancelHref: string;
  successHref: string;
  canEdit?: boolean;
  initialValue?: Record<string, unknown>;
  items: ItemOption[];
  locations: Option[];
  departments?: Option[];
  users?: Option[];
  stockSnapshotEndpoint?: string;
}

interface InventoryDocumentDetailProps {
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  status: string;
  summary: Array<{ label: string; value: string }>;
  items: Array<Record<string, string | number>>;
  itemColumns: Array<{ key: string; label: string }>;
  approvalHistory?: Array<{ status: string; requestedBy: string; assignedApprover?: string; approvedBy?: string; comment?: string; createdAt: string }>;
  documentHistory?: Array<{ action: string; performedBy?: string; comment?: string; createdAt: string }>;
  auditTrail?: Array<{ action: string; user?: string; timestamp: string }>;
  editHref?: string;
  postEndpoint?: string;
  approveEndpoint?: string;
  rejectEndpoint?: string;
  cancelEndpoint?: string;
  generateIssueEndpoint?: string;
  afterActionHref?: string;
}

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

function badgeForStatus(status: string) {
  switch (status) {
    case "POSTED":
    case "APPROVED":
    case "ISSUED":
      return "posted";
    case "REJECTED":
    case "CANCELLED":
      return "voided";
    case "SUBMITTED":
    case "PARTIALLY_ISSUED":
      return "pending";
    default:
      return "draft";
  }
}

function defaultHeaderValue(kind: InventoryDocumentKind, key: string, initialValue?: Record<string, unknown>) {
  const today = new Date().toISOString().slice(0, 10);
  const seeded = initialValue?.[key];
  if (typeof seeded === "string" || typeof seeded === "number") {
    return String(seeded);
  }

  switch (key) {
    case "transferDate":
    case "adjustmentDate":
    case "issueDate":
    case "returnDate":
    case "requisitionDate":
      return today;
    case "issuedToType":
    case "returnedFromType":
      return "Department";
    default:
      return "";
  }
}

function normalizeLineItems(kind: InventoryDocumentKind, rawItems: unknown): EditableLine[] {
  const rows = Array.isArray(rawItems) ? rawItems : [];
  const mapped = rows.map((row) => {
    const line = row as Record<string, unknown>;
    return {
      itemId: String(line.itemId ?? ""),
      quantity: Number(line.quantity ?? 0) || 0,
      unitCost: Number(line.unitCost ?? 0) || 0,
      remarks: String(line.remarks ?? ""),
      systemQty: Number(line.systemQty ?? 0) || 0,
      physicalQty: Number(line.physicalQty ?? 0) || 0,
      differenceQty: Number(line.differenceQty ?? 0) || 0,
      requestedQty: Number(line.requestedQty ?? 0) || 0,
      approvedQty: Number(line.approvedQty ?? 0) || 0,
      issuedQty: Number(line.issuedQty ?? 0) || 0,
    };
  });

  if (mapped.length > 0) {
    return mapped;
  }

  return kind === "adjustment"
    ? [{ itemId: "", systemQty: 0, physicalQty: 0, differenceQty: 0, unitCost: 0, remarks: "" }]
    : kind === "requisition"
      ? [{ itemId: "", requestedQty: 0, approvedQty: 0, issuedQty: 0, remarks: "" }]
      : [{ itemId: "", quantity: 0, unitCost: 0, remarks: "" }];
}

export function InventoryDocumentListPage({
  title,
  subtitle,
  breadcrumbs,
  createHref,
  rows,
  searchPlaceholder,
  primaryColumnLabel,
  secondaryColumnLabel,
  ownerColumnLabel,
  baseHref,
}: InventoryDocumentListPageProps) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return rows;
    }

    return rows.filter((row) =>
      [
        row.number,
        row.primaryText,
        row.secondaryText,
        row.ownerText,
        row.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const columns: Column<InventoryDocumentListRow>[] = [
    { key: "number", label: "Document No", sortable: true },
    { key: "date", label: "Date", sortable: true, render: (value) => formatDate(String(value)) },
    { key: "primaryText", label: primaryColumnLabel },
    ...(secondaryColumnLabel ? [{ key: "secondaryText", label: secondaryColumnLabel }] as Column<InventoryDocumentListRow>[] : []),
    { key: "itemCount", label: "Items", render: (value) => Number(value).toLocaleString() },
    ...(ownerColumnLabel ? [{ key: "ownerText", label: ownerColumnLabel }] as Column<InventoryDocumentListRow>[] : []),
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={badgeForStatus(String(value)) as never} />,
    },
  ];

  const actions: TableAction[] = [
    { label: "View", onClick: (record) => (window.location.href = `${baseHref}/${(record as InventoryDocumentListRow).id}`) },
    { label: "Edit", onClick: (record) => (window.location.href = `${baseHref}/${(record as InventoryDocumentListRow).id}/edit`) },
  ];

  const pageActions: Action[] = [
    { label: "Create", variant: "primary", onClick: () => (window.location.href = createHref) },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} actions={<ActionButtons actions={pageActions} />} />
      <div style={cardStyle}>
        <SearchInput value={search} onChange={setSearch} placeholder={searchPlaceholder} />
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        actions={actions}
        pageSize={15}
        emptyState={<EmptyState title={`No ${title} Found`} message={`There are no ${title.toLowerCase()} to display right now.`} />}
      />
    </div>
  );
}

export function InventoryDocumentEditor({
  kind,
  mode,
  documentId,
  title,
  subtitle,
  breadcrumbs,
  apiBasePath,
  cancelHref,
  successHref,
  canEdit = true,
  initialValue,
  items,
  locations,
  departments = [],
  users = [],
  stockSnapshotEndpoint = "/api/inventory/stock-snapshot",
}: InventoryDocumentEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [stockSnapshots, setStockSnapshots] = useState<Record<string, { availableQuantity: number; averageCost: number; locationName: string; uomName: string | null; status: string } | null>>({});
  const [header, setHeader] = useState<Record<string, string>>({
    transferDate: defaultHeaderValue(kind, "transferDate", initialValue),
    fromLocationId: defaultHeaderValue(kind, "fromLocationId", initialValue),
    toLocationId: defaultHeaderValue(kind, "toLocationId", initialValue),
    adjustmentDate: defaultHeaderValue(kind, "adjustmentDate", initialValue),
    locationId: defaultHeaderValue(kind, "locationId", initialValue),
    reason: defaultHeaderValue(kind, "reason", initialValue),
    issueDate: defaultHeaderValue(kind, "issueDate", initialValue),
    issuedToType: defaultHeaderValue(kind, "issuedToType", initialValue),
    issuedToId: defaultHeaderValue(kind, "issuedToId", initialValue),
    purpose: defaultHeaderValue(kind, "purpose", initialValue),
    returnDate: defaultHeaderValue(kind, "returnDate", initialValue),
    returnedFromType: defaultHeaderValue(kind, "returnedFromType", initialValue),
    returnedFromId: defaultHeaderValue(kind, "returnedFromId", initialValue),
    requisitionDate: defaultHeaderValue(kind, "requisitionDate", initialValue),
    requestedById: defaultHeaderValue(kind, "requestedById", initialValue),
    approverId: defaultHeaderValue(kind, "approverId", initialValue),
    toDepartmentId: defaultHeaderValue(kind, "toDepartmentId", initialValue),
    remarks: defaultHeaderValue(kind, "remarks", initialValue),
  });
  const [lineItems, setLineItems] = useState<EditableLine[]>(() => normalizeLineItems(kind, initialValue?.items));

  const targetActors = kind === "issue"
    ? departments
    : kind === "return"
      ? departments
      : users;

  const selectedLocationId =
    kind === "transfer" || kind === "requisition"
      ? header.fromLocationId
      : header.locationId;

  useEffect(() => {
    let cancelled = false;

    async function loadSnapshots() {
      if (!selectedLocationId) {
        setStockSnapshots({});
        return;
      }

      const uniqueItemIds = [...new Set(lineItems.map((line) => line.itemId).filter(Boolean))];
      if (uniqueItemIds.length === 0) {
        setStockSnapshots({});
        return;
      }

      const entries = await Promise.all(
        uniqueItemIds.map(async (itemId) => {
          try {
            const response = await fetch(`${stockSnapshotEndpoint}?itemId=${encodeURIComponent(itemId)}&locationId=${encodeURIComponent(selectedLocationId)}`);
            if (!response.ok) {
              return [itemId, null] as const;
            }
            return [itemId, await response.json()] as const;
          } catch {
            return [itemId, null] as const;
          }
        }),
      );

      if (!cancelled) {
        setStockSnapshots(Object.fromEntries(entries));
      }
    }

    loadSnapshots();
    return () => {
      cancelled = true;
    };
  }, [lineItems, selectedLocationId, stockSnapshotEndpoint]);

  function updateLine(index: number, key: keyof EditableLine, value: string | number) {
    setLineItems((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) {
          return line;
        }

        const next = { ...line, [key]: value };
        if (kind === "adjustment") {
          const systemQty = Number(next.systemQty ?? 0);
          const physicalQty = Number(next.physicalQty ?? 0);
          next.differenceQty = physicalQty - systemQty;
        }
        if ((key === "itemId" && !line.unitCost) || key === "itemId") {
          const item = items.find((entry) => entry.value === String(value));
          if (item && (!next.unitCost || next.unitCost === 0)) {
            next.unitCost = Number(item.unitCost ?? 0);
          }
        }
        return next;
      }),
    );
  }

  function addRow() {
    setLineItems((current) => [...current, ...normalizeLineItems(kind, [])]);
  }

  function removeRow(index: number) {
    setLineItems((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }

  function payloadForStatus(status: string) {
    const body: Record<string, unknown> = { ...header, status };
    body.lineItems = lineItems.map((line) => ({
      itemId: line.itemId,
      quantity: Number(line.quantity ?? 0),
      unitCost: Number(line.unitCost ?? 0),
      remarks: line.remarks ?? "",
      systemQty: Number(line.systemQty ?? 0),
      physicalQty: Number(line.physicalQty ?? 0),
      differenceQty: Number(line.differenceQty ?? 0),
      requestedQty: Number(line.requestedQty ?? 0),
      approvedQty: Number(line.approvedQty ?? 0),
      issuedQty: Number(line.issuedQty ?? 0),
    }));
    return body;
  }

  function save(status: string) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(documentId ? `${apiBasePath}/${documentId}` : apiBasePath, {
        method: documentId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payloadForStatus(status)),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to save document");
        return;
      }
      router.push(documentId ? `${successHref}/${documentId}` : `${successHref}/${result.id}`);
      router.refresh();
    });
  }

  const pageActions: Action[] = [
    { label: "Cancel", variant: "secondary", onClick: () => router.push(cancelHref), disabled: isPending },
    { label: "Save Draft", variant: "secondary", onClick: () => save("DRAFT"), loading: isPending, disabled: !canEdit },
    { label: "Submit", variant: "primary", onClick: () => save("SUBMITTED"), loading: isPending, disabled: !canEdit },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: typography.sizes.h6.fontSize }}>Document Details</h2>
          {message ? <span style={{ color: colors.danger[600], fontSize: typography.sizes.small.fontSize }}>{message}</span> : null}
        </div>
        <div style={fieldGridStyle}>
          {(kind === "transfer" || kind === "adjustment" || kind === "issue" || kind === "return" || kind === "requisition") && (
            <div style={fieldStyle}>
              <label style={labelStyle}>
                {kind === "transfer" ? "Transfer Date" : kind === "adjustment" ? "Adjustment Date" : kind === "issue" ? "Issue Date" : kind === "return" ? "Return Date" : "Requisition Date"}
              </label>
              <input
                disabled={!canEdit}
                style={inputStyle}
                type="date"
                value={header.transferDate || header.adjustmentDate || header.issueDate || header.returnDate || header.requisitionDate}
                onChange={(event) =>
                  setHeader((current) => ({
                    ...current,
                    transferDate: kind === "transfer" ? event.target.value : current.transferDate,
                    adjustmentDate: kind === "adjustment" ? event.target.value : current.adjustmentDate,
                    issueDate: kind === "issue" ? event.target.value : current.issueDate,
                    returnDate: kind === "return" ? event.target.value : current.returnDate,
                    requisitionDate: kind === "requisition" ? event.target.value : current.requisitionDate,
                  }))
                }
              />
            </div>
          )}

          {(kind === "transfer" || kind === "adjustment" || kind === "issue" || kind === "return" || kind === "requisition") && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Assigned Approver</label>
              <select
                disabled={!canEdit}
                style={inputStyle}
                value={header.approverId}
                onChange={(event) => setHeader((current) => ({ ...current, approverId: event.target.value }))}
              >
                <option value="">No explicit approver</option>
                {users.map((user) => (
                  <option key={user.value} value={user.value}>{user.label}</option>
                ))}
              </select>
            </div>
          )}

          {(kind === "transfer" || kind === "requisition") && (
            <div style={fieldStyle}>
              <label style={labelStyle}>From Location</label>
              <select
                disabled={!canEdit}
                style={inputStyle}
                value={header.fromLocationId}
                onChange={(event) => setHeader((current) => ({ ...current, fromLocationId: event.target.value }))}
              >
                <option value="">Select location</option>
                {locations.map((location) => (
                  <option key={location.value} value={location.value}>{location.label}</option>
                ))}
              </select>
            </div>
          )}

          {kind === "transfer" && (
            <div style={fieldStyle}>
              <label style={labelStyle}>To Location</label>
              <select
                disabled={!canEdit}
                style={inputStyle}
                value={header.toLocationId}
                onChange={(event) => setHeader((current) => ({ ...current, toLocationId: event.target.value }))}
              >
                <option value="">Select location</option>
                {locations.map((location) => (
                  <option key={location.value} value={location.value}>{location.label}</option>
                ))}
              </select>
            </div>
          )}

          {(kind === "adjustment" || kind === "issue" || kind === "return") && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Location</label>
              <select
                disabled={!canEdit}
                style={inputStyle}
                value={header.locationId}
                onChange={(event) => setHeader((current) => ({ ...current, locationId: event.target.value }))}
              >
                <option value="">Select location</option>
                {locations.map((location) => (
                  <option key={location.value} value={location.value}>{location.label}</option>
                ))}
              </select>
            </div>
          )}

          {kind === "adjustment" && (
            <div style={fieldStyle}>
              <label style={labelStyle}>Reason</label>
              <input
                disabled={!canEdit}
                style={inputStyle}
                value={header.reason}
                onChange={(event) => setHeader((current) => ({ ...current, reason: event.target.value }))}
              />
            </div>
          )}

          {kind === "issue" && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Issued To Type</label>
                <select
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.issuedToType}
                  onChange={(event) => setHeader((current) => ({ ...current, issuedToType: event.target.value }))}
                >
                  {["Department", "Production", "Maintenance", "QC", "Fleet", "Other"].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Issued To</label>
                <select
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.issuedToId}
                  onChange={(event) => setHeader((current) => ({ ...current, issuedToId: event.target.value }))}
                >
                  <option value="">Select recipient</option>
                  {targetActors.map((entry) => (
                    <option key={entry.value} value={entry.value}>{entry.label}</option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Purpose</label>
                <input
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.purpose}
                  onChange={(event) => setHeader((current) => ({ ...current, purpose: event.target.value }))}
                />
              </div>
            </>
          )}

          {kind === "return" && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Returned From Type</label>
                <select
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.returnedFromType}
                  onChange={(event) => setHeader((current) => ({ ...current, returnedFromType: event.target.value }))}
                >
                  {["Department", "Production", "Maintenance", "QC", "Fleet", "Other"].map((value) => (
                    <option key={value} value={value}>{value}</option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Returned From</label>
                <select
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.returnedFromId}
                  onChange={(event) => setHeader((current) => ({ ...current, returnedFromId: event.target.value }))}
                >
                  <option value="">Select source</option>
                  {targetActors.map((entry) => (
                    <option key={entry.value} value={entry.value}>{entry.label}</option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Reason</label>
                <input
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.reason}
                  onChange={(event) => setHeader((current) => ({ ...current, reason: event.target.value }))}
                />
              </div>
            </>
          )}

          {kind === "requisition" && (
            <>
              <div style={fieldStyle}>
                <label style={labelStyle}>Requested By</label>
                <select
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.requestedById}
                  onChange={(event) => setHeader((current) => ({ ...current, requestedById: event.target.value }))}
                >
                  <option value="">Select user</option>
                  {users.map((user) => (
                    <option key={user.value} value={user.value}>{user.label}</option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>To Location</label>
                <select
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.toLocationId}
                  onChange={(event) => setHeader((current) => ({ ...current, toLocationId: event.target.value }))}
                >
                  <option value="">Select location</option>
                  {locations.map((location) => (
                    <option key={location.value} value={location.value}>{location.label}</option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>To Department</label>
                <select
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.toDepartmentId}
                  onChange={(event) => setHeader((current) => ({ ...current, toDepartmentId: event.target.value }))}
                >
                  <option value="">Select department</option>
                  {departments.map((department) => (
                    <option key={department.value} value={department.value}>{department.label}</option>
                  ))}
                </select>
              </div>
              <div style={fieldStyle}>
                <label style={labelStyle}>Purpose</label>
                <input
                  disabled={!canEdit}
                  style={inputStyle}
                  value={header.purpose}
                  onChange={(event) => setHeader((current) => ({ ...current, purpose: event.target.value }))}
                />
              </div>
            </>
          )}

          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea
              disabled={!canEdit}
              style={{ ...inputStyle, minHeight: "88px", resize: "vertical" }}
              value={header.remarks}
              onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))}
            />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: typography.sizes.h6.fontSize }}>Items</h2>
          <button disabled={!canEdit} style={{ ...inputStyle, width: "auto", cursor: "pointer" }} onClick={addRow}>
            Add Item
          </button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {lineItems.map((line, index) => (
            <div key={`${line.itemId}-${index}`} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: kind === "adjustment"
                    ? "2fr repeat(4, 1fr) 2fr auto"
                    : kind === "requisition"
                      ? "2fr repeat(4, 1fr) 2fr auto"
                      : "2fr 1fr 1fr 2fr auto",
                  gap: "8px",
                  alignItems: "center",
                }}
              >
              <select
                disabled={!canEdit}
                style={inputStyle}
                value={line.itemId}
                onChange={(event) => updateLine(index, "itemId", event.target.value)}
              >
                <option value="">Select item</option>
                {items.map((item) => (
                  <option key={item.value} value={item.value}>{item.label}</option>
                ))}
              </select>

              {kind === "adjustment" ? (
                <>
                  <input disabled={!canEdit} style={inputStyle} type="number" value={line.systemQty ?? 0} onChange={(event) => updateLine(index, "systemQty", Number(event.target.value))} />
                  <input disabled={!canEdit} style={inputStyle} type="number" value={line.physicalQty ?? 0} onChange={(event) => updateLine(index, "physicalQty", Number(event.target.value))} />
                  <input disabled style={inputStyle} type="number" value={line.differenceQty ?? 0} />
                  <input disabled={!canEdit} style={inputStyle} type="number" value={line.unitCost ?? 0} onChange={(event) => updateLine(index, "unitCost", Number(event.target.value))} />
                </>
              ) : kind === "requisition" ? (
                <>
                  <input disabled={!canEdit} style={inputStyle} type="number" value={line.requestedQty ?? 0} onChange={(event) => updateLine(index, "requestedQty", Number(event.target.value))} />
                  <input disabled={!canEdit} style={inputStyle} type="number" value={line.approvedQty ?? 0} onChange={(event) => updateLine(index, "approvedQty", Number(event.target.value))} />
                  <input disabled={!canEdit} style={inputStyle} type="number" value={line.issuedQty ?? 0} onChange={(event) => updateLine(index, "issuedQty", Number(event.target.value))} />
                  <input disabled style={inputStyle} type="number" value={Number(line.approvedQty ?? 0) - Number(line.issuedQty ?? 0)} />
                </>
              ) : (
                <>
                  <input disabled={!canEdit} style={inputStyle} type="number" value={line.quantity ?? 0} onChange={(event) => updateLine(index, "quantity", Number(event.target.value))} />
                  <input disabled={!canEdit} style={inputStyle} type="number" value={line.unitCost ?? 0} onChange={(event) => updateLine(index, "unitCost", Number(event.target.value))} />
                </>
              )}

              <input
                disabled={!canEdit}
                style={inputStyle}
                value={line.remarks ?? ""}
                onChange={(event) => updateLine(index, "remarks", event.target.value)}
                placeholder="Remarks"
              />
              <button disabled={!canEdit} style={{ ...inputStyle, width: "auto", cursor: "pointer" }} onClick={() => removeRow(index)}>
                Remove
              </button>
              </div>
              {line.itemId && selectedLocationId ? (
                <div style={{ color: colors.text.secondary, fontSize: typography.sizes.caption.fontSize }}>
                  {stockSnapshots[line.itemId]
                    ? `Available: ${stockSnapshots[line.itemId]?.availableQuantity.toLocaleString()} ${stockSnapshots[line.itemId]?.uomName ?? ""} at ${stockSnapshots[line.itemId]?.locationName} | Avg Cost: ${Number(stockSnapshots[line.itemId]?.averageCost ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} | Status: ${stockSnapshots[line.itemId]?.status.replaceAll("_", " ")}`
                    : "No stock snapshot found for this item at the selected location."}
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...cardStyle, display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons actions={pageActions} />
      </div>
    </div>
  );
}

export function InventoryDocumentDetail({
  title,
  subtitle,
  breadcrumbs,
  status,
  summary,
  items,
  itemColumns,
  approvalHistory = [],
  documentHistory = [],
  auditTrail = [],
  editHref,
  postEndpoint,
  approveEndpoint,
  rejectEndpoint,
  cancelEndpoint,
  generateIssueEndpoint,
  afterActionHref,
}: InventoryDocumentDetailProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function runAction(endpoint: string) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(endpoint, { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Action failed");
        return;
      }
      router.push(afterActionHref ?? window.location.pathname);
      router.refresh();
    });
  }

  const actions: Action[] = [
    ...(editHref ? [{ label: "Edit", variant: "secondary" as const, onClick: () => router.push(editHref), disabled: isPending }] : []),
    ...(approveEndpoint ? [{ label: "Approve", variant: "secondary" as const, onClick: () => runAction(approveEndpoint), loading: isPending }] : []),
    ...(rejectEndpoint ? [{ label: "Reject", variant: "danger" as const, onClick: () => runAction(rejectEndpoint), loading: isPending }] : []),
    ...(cancelEndpoint ? [{ label: "Cancel Doc", variant: "warning" as const, onClick: () => runAction(cancelEndpoint), loading: isPending }] : []),
    ...(postEndpoint ? [{ label: "Post", variant: "primary" as const, onClick: () => runAction(postEndpoint), loading: isPending }] : []),
    ...(generateIssueEndpoint ? [{ label: "Generate Issue", variant: "primary" as const, onClick: () => runAction(generateIssueEndpoint), loading: isPending }] : []),
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title={title}
        subtitle={subtitle}
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={actions} />}
      />

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: typography.sizes.h6.fontSize }}>Summary</h2>
          <StatusBadge status={badgeForStatus(status) as never} />
        </div>
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          {summary.map((entry) => (
            <div key={entry.label} style={fieldStyle}>
              <span style={labelStyle}>{entry.label}</span>
              <strong>{entry.value || "-"}</strong>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: typography.sizes.h6.fontSize }}>Items</h2>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr>
                {itemColumns.map((column) => (
                  <th
                    key={column.key}
                    style={{
                      textAlign: "left",
                      padding: "10px 8px",
                      borderBottom: `1px solid ${colors.border}`,
                      backgroundColor: colors.secondary[50],
                      fontSize: typography.sizes.caption.fontSize,
                    }}
                  >
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={index}>
                  {itemColumns.map((column) => (
                    <td key={column.key} style={{ padding: "10px 8px", borderBottom: `1px solid ${colors.border}` }}>
                      {String(item[column.key] ?? "-")}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: typography.sizes.h6.fontSize }}>Approval History</h2>
        {approvalHistory.length === 0 ? (
          <p style={{ margin: 0, color: colors.text.secondary }}>No approval history recorded yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {approvalHistory.map((entry, index) => (
              <div key={`${entry.status}-${entry.createdAt}-${index}`} style={{ paddingBottom: "10px", borderBottom: `1px solid ${colors.border}` }}>
                <strong>{entry.status}</strong>
                <div style={{ color: colors.text.secondary, fontSize: typography.sizes.small.fontSize }}>
                  Requested by {entry.requestedBy}
                  {entry.assignedApprover ? `, assigned to ${entry.assignedApprover}` : ""}
                  {entry.approvedBy ? `, action by ${entry.approvedBy}` : ""}
                </div>
                <div style={{ color: colors.text.secondary, fontSize: typography.sizes.small.fontSize }}>
                  {new Date(entry.createdAt).toLocaleString("en-KE")}
                </div>
                {entry.comment ? <div>{entry.comment}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: typography.sizes.h6.fontSize }}>Document History</h2>
        {documentHistory.length === 0 ? (
          <p style={{ margin: 0, color: colors.text.secondary }}>No document history recorded yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {documentHistory.map((entry, index) => (
              <div key={`${entry.action}-${entry.createdAt}-${index}`} style={{ paddingBottom: "10px", borderBottom: `1px solid ${colors.border}` }}>
                <strong>{entry.action}</strong>
                <div style={{ color: colors.text.secondary, fontSize: typography.sizes.small.fontSize }}>
                  {entry.performedBy ? `By ${entry.performedBy}` : "System"} on {new Date(entry.createdAt).toLocaleString("en-KE")}
                </div>
                {entry.comment ? <div>{entry.comment}</div> : null}
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={cardStyle}>
        <h2 style={{ marginTop: 0, fontSize: typography.sizes.h6.fontSize }}>Audit Trail</h2>
        {auditTrail.length === 0 ? (
          <p style={{ margin: 0, color: colors.text.secondary }}>No audit entries recorded yet.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {auditTrail.map((entry, index) => (
              <div key={`${entry.action}-${entry.timestamp}-${index}`} style={{ paddingBottom: "10px", borderBottom: `1px solid ${colors.border}` }}>
                <strong>{entry.action}</strong>
                <div style={{ color: colors.text.secondary, fontSize: typography.sizes.small.fontSize }}>
                  {entry.user ? `By ${entry.user}` : "System"} on {new Date(entry.timestamp).toLocaleString("en-KE")}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

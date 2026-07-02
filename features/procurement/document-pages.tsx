"use client";

import { useMemo, useState, useTransition } from "react";
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

type Option = { value: string; label: string };
type ItemOption = Option & {
  itemCode: string;
  itemName: string;
  uomId?: string;
  uomName: string;
  unitCost: number;
};
type SupplierOption = Option & { paymentTerms: string };
type TaxOption = Option & { rate: number };

type ListRow = {
  id: string;
  number: string;
  date: string;
  status: string;
  primary: string;
  secondary: string;
  owner: string;
  itemCount: number;
  amount: number;
};

type RequisitionLine = {
  itemId: string;
  uomId: string;
  requestedQty: number;
  approvedQty: number;
  estimatedUnitPrice: number;
  remarks: string;
};

type PurchaseOrderLine = {
  prItemId?: string;
  itemId: string;
  uomId: string;
  orderedQty: number;
  unitPrice: number;
  taxCodeId: string;
  taxRate: number;
  remarks: string;
};

type RequisitionEditorProps = {
  mode: "create" | "edit";
  documentId?: string;
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  apiBasePath: string;
  cancelHref: string;
  successHref: string;
  canEdit?: boolean;
  users: Option[];
  departments: Option[];
  locations: Option[];
  items: ItemOption[];
  initialValue?: {
    requisitionDate: string;
    requestedById: string;
    departmentId: string;
    locationId: string;
    neededByDate: string;
    purpose: string;
    remarks: string;
    approverId?: string;
    items: RequisitionLine[];
  };
};

type PurchaseOrderEditorProps = {
  mode: "create" | "edit";
  documentId?: string;
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  apiBasePath: string;
  cancelHref: string;
  successHref: string;
  canEdit?: boolean;
  suppliers: SupplierOption[];
  locations: Option[];
  items: ItemOption[];
  taxCodes: TaxOption[];
  initialValue?: {
    poDate: string;
    supplierId: string;
    prId: string;
    deliveryLocationId: string;
    expectedDeliveryDate: string;
    paymentTerms: string;
    remarks: string;
    approverId?: string;
    items: PurchaseOrderLine[];
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

function badgeForStatus(status: string) {
  switch (String(status).toUpperCase()) {
    case "APPROVED":
    case "POSTED":
    case "RECEIVED":
    case "PAID":
    case "CONVERTED":
      return "posted";
    case "REJECTED":
    case "CANCELLED":
      return "voided";
    case "SUBMITTED":
    case "PARTIALLY_CONVERTED":
    case "PARTIALLY_RECEIVED":
    case "PARTIAL_PAID":
      return "pending";
    default:
      return "draft";
  }
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value));
}

export function ProcurementListPage({
  title,
  subtitle,
  breadcrumbs,
  createHref,
  baseHref,
  primaryLabel,
  secondaryLabel,
  ownerLabel,
  rows,
}: {
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  createHref: string;
  baseHref: string;
  primaryLabel: string;
  secondaryLabel: string;
  ownerLabel: string;
  rows: ListRow[];
}) {
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.number, row.primary, row.secondary, row.owner, row.status].some((value) =>
        String(value).toLowerCase().includes(query),
      ),
    );
  }, [rows, search]);

  const columns: Column<ListRow>[] = [
    { key: "number", label: "Document No", sortable: true },
    { key: "date", label: "Date", render: (value) => formatDate(String(value)) },
    { key: "primary", label: primaryLabel },
    { key: "secondary", label: secondaryLabel },
    { key: "owner", label: ownerLabel },
    { key: "itemCount", label: "Items" },
    {
      key: "amount",
      label: "Amount",
      render: (value) =>
        Number(value).toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        }),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => <StatusBadge status={badgeForStatus(String(value)) as never} />,
    },
  ];

  const actions: TableAction[] = [
    { label: "View", onClick: (record) => { window.location.href = `${baseHref}/${(record as ListRow).id}`; } },
    { label: "Edit", onClick: (record) => { window.location.href = `${baseHref}/${(record as ListRow).id}/edit`; } },
  ];

  const pageActions: Action[] = [
    { label: "Create", variant: "primary", onClick: () => { window.location.href = createHref; } },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} actions={<ActionButtons actions={pageActions} />} />
      <div style={cardStyle}>
        <SearchInput value={search} onChange={setSearch} placeholder={`Search ${title.toLowerCase()}...`} />
      </div>
      <DataTable
        columns={columns}
        data={filtered}
        actions={actions}
        pageSize={15}
        emptyState={<EmptyState title={`No ${title}`} message={`There are no ${title.toLowerCase()} recorded yet.`} />}
      />
    </div>
  );
}

export function PurchaseRequisitionEditor({
  documentId,
  title,
  subtitle,
  breadcrumbs,
  apiBasePath,
  cancelHref,
  successHref,
  canEdit = true,
  users,
  departments,
  locations,
  items,
  initialValue,
}: RequisitionEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    requisitionDate: initialValue?.requisitionDate ?? new Date().toISOString().slice(0, 10),
    requestedById: initialValue?.requestedById ?? "",
    departmentId: initialValue?.departmentId ?? "",
    locationId: initialValue?.locationId ?? "",
    neededByDate: initialValue?.neededByDate ?? "",
    purpose: initialValue?.purpose ?? "",
    remarks: initialValue?.remarks ?? "",
    approverId: initialValue?.approverId ?? "",
  });
  const [lineItems, setLineItems] = useState<RequisitionLine[]>(
    initialValue?.items?.length
      ? initialValue.items
      : [{ itemId: "", uomId: "", requestedQty: 0, approvedQty: 0, estimatedUnitPrice: 0, remarks: "" }],
  );

  function updateLine(index: number, key: keyof RequisitionLine, value: string | number) {
    setLineItems((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const next = { ...line, [key]: value };
        if (key === "itemId") {
          const item = items.find((entry) => entry.value === String(value));
          if (item) {
            next.uomId = item.uomId ?? "";
          }
        }
        if (key === "requestedQty" && (!next.approvedQty || next.approvedQty === 0)) {
          next.approvedQty = Number(value);
        }
        return next;
      }),
    );
  }

  function addRow() {
    setLineItems((current) => [...current, { itemId: "", uomId: "", requestedQty: 0, approvedQty: 0, estimatedUnitPrice: 0, remarks: "" }]);
  }

  function removeRow(index: number) {
    setLineItems((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }

  function save(status: string) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(documentId ? `${apiBasePath}/${documentId}` : apiBasePath, {
        method: documentId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...header, status, lineItems }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to save purchase requisition");
        return;
      }
      router.push(documentId ? `${successHref}/${documentId}` : `${successHref}/${result.id}`);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />
      <div style={cardStyle}>
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>PR Date</label>
            <input type="date" style={inputStyle} value={header.requisitionDate} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, requisitionDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Requested By</label>
            <select style={inputStyle} value={header.requestedById} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, requestedById: event.target.value }))}>
              <option value="">Select user</option>
              {users.map((user) => <option key={user.value} value={user.value}>{user.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Department</label>
            <select style={inputStyle} value={header.departmentId} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, departmentId: event.target.value }))}>
              <option value="">Select department</option>
              {departments.map((department) => <option key={department.value} value={department.value}>{department.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Location</label>
            <select style={inputStyle} value={header.locationId} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, locationId: event.target.value }))}>
              <option value="">Select location</option>
              {locations.map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Needed By</label>
            <input type="date" style={inputStyle} value={header.neededByDate} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, neededByDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Assigned Approver</label>
            <select style={inputStyle} value={header.approverId} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, approverId: event.target.value }))}>
              <option value="">No explicit approver</option>
              {users.map((user) => <option key={user.value} value={user.value}>{user.label}</option>)}
            </select>
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Purpose</label>
            <input style={inputStyle} value={header.purpose} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, purpose: event.target.value }))} />
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={header.remarks} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: typography.sizes.h6.fontSize }}>Items</h2>
          <button type="button" disabled={!canEdit} style={{ ...inputStyle, width: "auto", cursor: "pointer" }} onClick={addRow}>Add Item</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {lineItems.map((line, index) => {
            const selectedItem = items.find((item) => item.value === line.itemId);
            const estimatedTotal = Number(line.requestedQty ?? 0) * Number(line.estimatedUnitPrice ?? 0);
            return (
              <div key={`${line.itemId}-${index}`} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 2fr auto", gap: "8px", alignItems: "center" }}>
                  <select style={inputStyle} value={line.itemId} disabled={!canEdit} onChange={(event) => updateLine(index, "itemId", event.target.value)}>
                    <option value="">Select item</option>
                    {items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                  <input style={inputStyle} value={selectedItem?.uomName ?? ""} disabled />
                  <input type="number" style={inputStyle} value={line.requestedQty} disabled={!canEdit} onChange={(event) => updateLine(index, "requestedQty", Number(event.target.value))} />
                  <input type="number" style={inputStyle} value={line.approvedQty} disabled={!canEdit} onChange={(event) => updateLine(index, "approvedQty", Number(event.target.value))} />
                  <input type="number" style={inputStyle} value={line.estimatedUnitPrice} disabled={!canEdit} onChange={(event) => updateLine(index, "estimatedUnitPrice", Number(event.target.value))} />
                  <input style={inputStyle} value={line.remarks} disabled={!canEdit} onChange={(event) => updateLine(index, "remarks", event.target.value)} placeholder="Remarks" />
                  <button type="button" disabled={!canEdit} style={{ ...inputStyle, width: "auto", cursor: "pointer" }} onClick={() => removeRow(index)}>Remove</button>
                </div>
                <div style={{ color: colors.text.secondary, fontSize: typography.sizes.caption.fontSize }}>
                  Estimated Total: {estimatedTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ ...cardStyle, display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons
          actions={[
            { label: "Cancel", variant: "secondary", onClick: () => router.push(cancelHref), disabled: isPending },
            { label: "Save Draft", variant: "secondary", onClick: () => save("DRAFT"), loading: isPending, disabled: !canEdit },
            { label: "Submit", variant: "primary", onClick: () => save("SUBMITTED"), loading: isPending, disabled: !canEdit },
          ]}
        />
      </div>
    </div>
  );
}

export function PurchaseOrderEditor({
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
  items,
  taxCodes,
  initialValue,
}: PurchaseOrderEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    poDate: initialValue?.poDate ?? new Date().toISOString().slice(0, 10),
    supplierId: initialValue?.supplierId ?? "",
    prId: initialValue?.prId ?? "",
    deliveryLocationId: initialValue?.deliveryLocationId ?? "",
    expectedDeliveryDate: initialValue?.expectedDeliveryDate ?? "",
    paymentTerms: initialValue?.paymentTerms ?? "",
    remarks: initialValue?.remarks ?? "",
    approverId: initialValue?.approverId ?? "",
  });
  const [lineItems, setLineItems] = useState<PurchaseOrderLine[]>(
    initialValue?.items?.length
      ? initialValue.items
      : [{ itemId: "", uomId: "", orderedQty: 0, unitPrice: 0, taxCodeId: "", taxRate: 0, remarks: "" }],
  );

  function updateLine(index: number, key: keyof PurchaseOrderLine, value: string | number) {
    setLineItems((current) =>
      current.map((line, lineIndex) => {
        if (lineIndex !== index) return line;
        const next = { ...line, [key]: value };
        if (key === "itemId") {
          const item = items.find((entry) => entry.value === String(value));
          if (item) {
            next.uomId = item.uomId ?? "";
            if (!next.unitPrice || next.unitPrice === 0) {
              next.unitPrice = Number(item.unitCost ?? 0);
            }
          }
        }
        if (key === "taxCodeId") {
          const taxCode = taxCodes.find((entry) => entry.value === String(value));
          next.taxRate = Number(taxCode?.rate ?? 0);
        }
        return next;
      }),
    );
  }

  function addRow() {
    setLineItems((current) => [...current, { itemId: "", uomId: "", orderedQty: 0, unitPrice: 0, taxCodeId: "", taxRate: 0, remarks: "" }]);
  }

  function removeRow(index: number) {
    setLineItems((current) => current.filter((_, lineIndex) => lineIndex !== index));
  }

  function syncSupplier(supplierId: string) {
    const supplier = suppliers.find((entry) => entry.value === supplierId);
    setHeader((current) => ({
      ...current,
      supplierId,
      paymentTerms: current.paymentTerms || supplier?.paymentTerms || "",
    }));
  }

  function save(status: string) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(documentId ? `${apiBasePath}/${documentId}` : apiBasePath, {
        method: documentId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...header, status, lineItems }),
      });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to save purchase order");
        return;
      }
      router.push(documentId ? `${successHref}/${documentId}` : `${successHref}/${result.id}`);
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />
      <div style={cardStyle}>
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}>
            <label style={labelStyle}>PO Date</label>
            <input type="date" style={inputStyle} value={header.poDate} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, poDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Supplier</label>
            <select style={inputStyle} value={header.supplierId} disabled={!canEdit} onChange={(event) => syncSupplier(event.target.value)}>
              <option value="">Select supplier</option>
              {suppliers.map((supplier) => <option key={supplier.value} value={supplier.value}>{supplier.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>PR Reference</label>
            <input style={inputStyle} value={header.prId} disabled />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Delivery Location</label>
            <select style={inputStyle} value={header.deliveryLocationId} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, deliveryLocationId: event.target.value }))}>
              <option value="">Select location</option>
              {locations.map((location) => <option key={location.value} value={location.value}>{location.label}</option>)}
            </select>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Expected Delivery</label>
            <input type="date" style={inputStyle} value={header.expectedDeliveryDate} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, expectedDeliveryDate: event.target.value }))} />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>Payment Terms</label>
            <input style={inputStyle} value={header.paymentTerms} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, paymentTerms: event.target.value }))} />
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}>
            <label style={labelStyle}>Remarks</label>
            <textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={header.remarks} disabled={!canEdit} onChange={(event) => setHeader((current) => ({ ...current, remarks: event.target.value }))} />
          </div>
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ margin: 0, fontSize: typography.sizes.h6.fontSize }}>Items</h2>
          <button type="button" disabled={!canEdit} style={{ ...inputStyle, width: "auto", cursor: "pointer" }} onClick={addRow}>Add Item</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {lineItems.map((line, index) => {
            const selectedItem = items.find((item) => item.value === line.itemId);
            const taxable = Number(line.orderedQty ?? 0) * Number(line.unitPrice ?? 0);
            const taxAmount = taxable * (Number(line.taxRate ?? 0) / 100);
            const lineTotal = taxable + taxAmount;
            return (
              <div key={`${line.itemId}-${index}`} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 2fr auto", gap: "8px", alignItems: "center" }}>
                  <select style={inputStyle} value={line.itemId} disabled={!canEdit} onChange={(event) => updateLine(index, "itemId", event.target.value)}>
                    <option value="">Select item</option>
                    {items.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
                  </select>
                  <input style={inputStyle} value={selectedItem?.uomName ?? ""} disabled />
                  <input type="number" style={inputStyle} value={line.orderedQty} disabled={!canEdit} onChange={(event) => updateLine(index, "orderedQty", Number(event.target.value))} />
                  <input type="number" style={inputStyle} value={line.unitPrice} disabled={!canEdit} onChange={(event) => updateLine(index, "unitPrice", Number(event.target.value))} />
                  <select style={inputStyle} value={line.taxCodeId} disabled={!canEdit} onChange={(event) => updateLine(index, "taxCodeId", event.target.value)}>
                    <option value="">Tax code</option>
                    {taxCodes.map((taxCode) => <option key={taxCode.value} value={taxCode.value}>{taxCode.label}</option>)}
                  </select>
                  <input style={inputStyle} value={line.remarks} disabled={!canEdit} onChange={(event) => updateLine(index, "remarks", event.target.value)} placeholder="Remarks" />
                  <button type="button" disabled={!canEdit} style={{ ...inputStyle, width: "auto", cursor: "pointer" }} onClick={() => removeRow(index)}>Remove</button>
                </div>
                <div style={{ color: colors.text.secondary, fontSize: typography.sizes.caption.fontSize }}>
                  Tax Rate: {Number(line.taxRate ?? 0).toFixed(2)}% | Line Total: {lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ ...cardStyle, display: "flex", justifyContent: "flex-end" }}>
        <ActionButtons
          actions={[
            { label: "Cancel", variant: "secondary", onClick: () => router.push(cancelHref), disabled: isPending },
            { label: "Save Draft", variant: "secondary", onClick: () => save("DRAFT"), loading: isPending, disabled: !canEdit },
            { label: "Submit", variant: "primary", onClick: () => save("SUBMITTED"), loading: isPending, disabled: !canEdit },
          ]}
        />
      </div>
    </div>
  );
}

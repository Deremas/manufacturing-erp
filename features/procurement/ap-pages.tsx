"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Eye, Pencil, Printer, Wallet } from "lucide-react";

import { ActionButtons, DataTable, EmptyState, FormCard, FormattedNumberInput, PageHeader, SearchInput, StatusBadge, useFormSubmit } from "@/components/shared";
import type { Action, Breadcrumb, Column, TableAction } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { useProcurementApprovalDialog } from "./approval-controls";
import { formatMoney } from "@/lib/utils/format-number";
import {
  procurementCreateUrl,
  procurementEditUrl,
  procurementPrintUrl,
  procurementViewUrl,
} from "@/lib/procurement/routes";

type Option = { value: string; label: string };

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

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value));
}

function badgeForApStatus(status: string) {
  switch (String(status).toUpperCase()) {
    case "APPROVED":
    case "POSTED":
    case "PAID":
      return "posted";
    case "REJECTED":
    case "CANCELLED":
      return "voided";
    case "SUBMITTED":
    case "PARTIAL_PAID":
      return "pending";
    default:
      return "draft";
  }
}

export function AccountsPayableListPage({
  title,
  subtitle,
  breadcrumbs,
  createHref,
  baseHref,
  rows,
  columns,
  kind = "invoice",
  apiBasePath,
}: {
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  createHref: string;
  baseHref: string;
  rows: Array<Record<string, string | number>>;
  columns: Column<Record<string, string | number>>[];
  kind?: "invoice" | "payment";
  apiBasePath?: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const approval = useProcurementApprovalDialog({
    apiBasePath: apiBasePath ?? `/api${baseHref}`,
  });
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) => Object.values(row).some((value) => String(value).toLowerCase().includes(query)));
  }, [rows, search]);

  const statusOf = (record: Record<string, string | number>) => String(record.status ?? "").toUpperCase();
  const numberKey = kind === "invoice" ? "invoiceNo" : "paymentNo";

  const resolvedColumns: Column<Record<string, string | number>>[] = columns.map((column) => {
    if (column.key === numberKey) {
      return {
        ...column,
        render: (_value, record) => (
          <a href={procurementViewUrl(kind, Number(record.publicId))} style={{ color: colors.primary[600], fontWeight: 600, textDecoration: "none" }}>
            {String(record[numberKey] ?? "")}
          </a>
        ),
      };
    }
    if (column.key === "status") {
      return {
        ...column,
        render: (value) => <StatusBadge status={badgeForApStatus(String(value)) as never} />,
      };
    }
    return column;
  });

  const actions: TableAction[] = [
    { label: "View", icon: <Eye size={16} />, onClick: (record) => { router.push(procurementViewUrl(kind, Number((record as { publicId: number }).publicId))); } },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      show: (record) => kind === "invoice"
        ? !["PAID", "CANCELLED"].includes(statusOf(record))
        : !["APPROVED", "CANCELLED"].includes(statusOf(record)),
      onClick: (record) => { router.push(procurementEditUrl(kind, Number((record as { publicId: number }).publicId))); },
    },
    {
      label: "Print",
      icon: <Printer size={16} />,
      onClick: (record) => { window.open(procurementPrintUrl(kind, Number((record as { publicId: number }).publicId)), "_blank", "noopener,noreferrer"); },
    },
    ...(kind === "invoice"
      ? [{
          label: "Record Payment",
          icon: <Wallet size={16} />,
          show: (record: Record<string, string | number>) => ["APPROVED", "PARTIAL_PAID", "POSTED"].includes(statusOf(record)),
          onClick: (record: Record<string, string | number>) => { router.push(procurementCreateUrl("payment", { invoicePublicId: Number(record.publicId) })); },
        }]
      : []),
    ...(apiBasePath ? approval.actions : []),
  ];

  const pageActions: Action[] = [{ label: "Create", variant: "primary", onClick: () => { router.push(createHref); } }];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} actions={<ActionButtons actions={pageActions} />} />
      <SearchInput value={search} onChange={setSearch} placeholder={`Search ${title.toLowerCase()}...`} />
      <DataTable columns={resolvedColumns} data={filtered} actions={actions} pageSize={15} emptyState={<EmptyState title={`No ${title}`} message={`There are no ${title.toLowerCase()} recorded yet.`} />} />
      {apiBasePath ? approval.dialog : null}
    </div>
  );
}

export function SupplierInvoiceEditor({
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
  purchaseOrders,
  goodsReceipts,
  initialValue,
}: {
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
  purchaseOrders: Option[];
  goodsReceipts: Option[];
  initialValue: {
    invoiceDate: string;
    dueDate: string;
    supplierId: string;
    poId: string;
    grnId: string;
    supplierInvoiceNo: string;
    remarks: string;
    items: Array<{ itemId: string; itemLabel: string; uomId?: string; uomName: string; quantity: number; unitPrice: number; taxAmount: number; remarks: string }>;
  };
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const { savingKey, isBusy, submitJson } = useFormSubmit();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    ...initialValue,
  });
  const [items, setItems] = useState(initialValue.items);

  async function loadPrefill(query: string) {
    setMessage("");
    startTransition(async () => {
      const response = await fetch(`/api/procurement/supplier-invoices/prefill?${query}`);
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to load invoice prefill");
        return;
      }
      setHeader((current) => ({
        ...current,
        supplierId: result.header.supplierId,
        poId: String(result.header.poId ?? current.poId ?? ""),
        grnId: String(result.header.grnId ?? current.grnId ?? ""),
      }));
      setItems(result.items.map((item: Record<string, unknown>) => ({
        itemId: String(item.itemId),
        itemLabel: `${String(item.itemCode)} - ${String(item.itemName)}`,
        uomId: item.uomId ? String(item.uomId) : undefined,
        uomName: String(item.uomName ?? ""),
        quantity: Number(item.quantity ?? 0),
        unitPrice: Number(item.unitPrice ?? 0),
        taxAmount: Number(item.taxAmount ?? 0),
        remarks: "",
      })));
    });
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
          itemId: item.itemId,
          uomId: item.uomId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          taxAmount: item.taxAmount,
          remarks: item.remarks,
        })),
      },
      errorFallback: "Unable to save supplier invoice",
      successHref: (result) =>
        procurementViewUrl(
          "invoice",
          Number(result.publicId ?? documentPublicId ?? 0),
        ),
      onError: setMessage,
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />
      <FormCard title="Invoice Header" variant="teal-header">
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}><label style={labelStyle}>Invoice Date</label><input type="date" style={inputStyle} value={header.invoiceDate} disabled={!canEdit} onChange={(event) => setHeader((c) => ({ ...c, invoiceDate: event.target.value }))} /></div>
          <div style={fieldStyle}><label style={labelStyle}>Due Date</label><input type="date" style={inputStyle} value={header.dueDate} disabled={!canEdit} onChange={(event) => setHeader((c) => ({ ...c, dueDate: event.target.value }))} /></div>
          <div style={fieldStyle}><label style={labelStyle}>Supplier</label><select style={inputStyle} value={header.supplierId} disabled><option value="">Select ...</option>{suppliers.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
          <div style={fieldStyle}><label style={labelStyle}>Supplier Invoice No</label><input style={inputStyle} value={header.supplierInvoiceNo} disabled={!canEdit} onChange={(event) => setHeader((c) => ({ ...c, supplierInvoiceNo: event.target.value }))} /></div>
          <div style={fieldStyle}><label style={labelStyle}>PO Reference</label><select style={inputStyle} value={header.poId} disabled={!canEdit || Boolean(documentId) || Boolean(header.grnId)} onChange={(event) => { setHeader((c) => ({ ...c, poId: event.target.value })); void loadPrefill(`poId=${encodeURIComponent(event.target.value)}`); }}><option value="">Select ...</option>{purchaseOrders.map((po) => <option key={po.value} value={po.value}>{po.label}</option>)}</select></div>
          <div style={fieldStyle}>
            <label style={labelStyle}>GRN Reference</label>
            <select style={inputStyle} value={header.grnId} disabled={!canEdit || Boolean(documentId)} onChange={(event) => { setHeader((c) => ({ ...c, grnId: event.target.value })); void loadPrefill(`grnId=${encodeURIComponent(event.target.value)}`); }}>
              <option value="">Select ...</option>
              {goodsReceipts.map((grn) => <option key={grn.value} value={grn.value}>{grn.label}</option>)}
            </select>
          </div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}><label style={labelStyle}>Remarks</label><textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={header.remarks} disabled={!canEdit} onChange={(event) => setHeader((c) => ({ ...c, remarks: event.target.value }))} /></div>
        </div>
      </FormCard>
      <FormCard title="Invoice Items" variant="teal-header">
        <div className="erp-table-scroll" style={itemGridScrollStyle}>
        <div style={{ ...itemGridHeaderStyle, gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", minWidth: "760px" }}>
          {["Item", "UOM", "Quantity", "Unit Price", "Tax Amount"].map((label) => (
            <div key={label}>{label}</div>
          ))}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "920px" }}>
          {items.map((item, index) => (
            <div key={`${item.itemId}-${index}`} style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr", gap: "8px", alignItems: "center" }}>
              <input style={inputStyle} value={item.itemLabel} disabled />
              <input style={inputStyle} value={item.uomName} disabled />
              <FormattedNumberInput style={inputStyle} decimals={0} value={item.quantity} disabled={!canEdit} onChange={(nextValue) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, quantity: nextValue } : row))} />
              <FormattedNumberInput style={inputStyle} decimals={2} value={item.unitPrice} disabled={!canEdit} onChange={(nextValue) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, unitPrice: nextValue } : row))} />
              <FormattedNumberInput style={inputStyle} decimals={2} value={item.taxAmount} disabled={!canEdit} onChange={(nextValue) => setItems((current) => current.map((row, rowIndex) => rowIndex === index ? { ...row, taxAmount: nextValue } : row))} />
            </div>
          ))}
        </div>
        </div>
      </FormCard>
      <ActionButtons actions={[
        { label: "Cancel", variant: "secondary", onClick: () => router.push(cancelHref), disabled: isBusy || isPending },
        { label: "Save Draft", variant: "secondary", onClick: () => save("DRAFT"), loading: savingKey === "DRAFT", loadingLabel: "Saving...", disabled: !canEdit || isPending },
        { label: "Submit for Approval", variant: "primary", onClick: () => save("SUBMITTED"), loading: savingKey === "SUBMITTED", loadingLabel: "Submitting...", disabled: !canEdit || isPending },
      ]} />
    </div>
  );
}

export function SupplierPaymentEditor({
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
  invoices,
  bankAccounts,
  initialValue,
}: {
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
  invoices: Array<Option & { supplierId: string; balanceDue: number }>;
  bankAccounts: Option[];
  initialValue: {
    paymentDate: string;
    supplierId: string;
    invoiceId: string;
    paymentMethod: string;
    bankAccountId: string;
    referenceNo: string;
    amount: number;
    remarks: string;
  };
}) {
  const router = useRouter();
  const { savingKey, isBusy, submitJson } = useFormSubmit();
  const [message, setMessage] = useState("");
  const [header, setHeader] = useState({
    ...initialValue,
  });

  const selectedInvoice = invoices.find((invoice) => invoice.value === header.invoiceId);

  function save(status: string) {
    setMessage("");
    void submitJson(status, {
      url: documentId ? `${apiBasePath}/${documentId}` : apiBasePath,
      method: documentId ? "PUT" : "POST",
      body: { ...header, status },
      errorFallback: "Unable to save supplier payment",
      successHref: (result) =>
        procurementViewUrl(
          "payment",
          Number(result.publicId ?? documentPublicId ?? 0),
        ),
      onError: setMessage,
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} />
      <FormCard title="Payment Header" variant="teal-header">
        {message ? <p style={{ marginTop: 0, color: colors.danger[600] }}>{message}</p> : null}
        <div style={fieldGridStyle}>
          <div style={fieldStyle}><label style={labelStyle}>Payment Date</label><input type="date" style={inputStyle} value={header.paymentDate} disabled={!canEdit} onChange={(event) => setHeader((c) => ({ ...c, paymentDate: event.target.value }))} /></div>
          <div style={fieldStyle}><label style={labelStyle}>Supplier</label><select style={inputStyle} value={header.supplierId} disabled={!canEdit} onChange={(event) => setHeader((c) => ({ ...c, supplierId: event.target.value, invoiceId: "", amount: 0 }))}><option value="">Select ...</option>{suppliers.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select></div>
          <div style={fieldStyle}><label style={labelStyle}>Invoice</label><select style={inputStyle} value={header.invoiceId} disabled={!canEdit} onChange={(event) => { const invoice = invoices.find((row) => row.value === event.target.value); setHeader((c) => ({ ...c, invoiceId: event.target.value, supplierId: invoice?.supplierId ?? c.supplierId, amount: invoice?.balanceDue ?? c.amount })); }}><option value="">Select ...</option>{invoices.filter((invoice) => !header.supplierId || invoice.supplierId === header.supplierId).map((invoice) => <option key={invoice.value} value={invoice.value}>{invoice.label}</option>)}</select></div>
          <div style={fieldStyle}><label style={labelStyle}>Method</label><select style={inputStyle} value={header.paymentMethod} disabled={!canEdit} onChange={(event) => setHeader((c) => ({ ...c, paymentMethod: event.target.value }))}><option value="BANK">Bank</option><option value="CASH">Cash</option><option value="CHEQUE">Cheque</option><option value="MOBILE_MONEY">Mobile Money</option></select></div>
          <div style={fieldStyle}><label style={labelStyle}>Bank Account</label><select style={inputStyle} value={header.bankAccountId} disabled={!canEdit || header.paymentMethod === "CASH"} onChange={(event) => setHeader((c) => ({ ...c, bankAccountId: event.target.value }))}><option value="">Select ...</option>{bankAccounts.map((entry) => <option key={entry.value} value={entry.value}>{entry.label}</option>)}</select></div>
          <div style={fieldStyle}><label style={labelStyle}>Reference No</label><input style={inputStyle} value={header.referenceNo} disabled={!canEdit} onChange={(event) => setHeader((c) => ({ ...c, referenceNo: event.target.value }))} /></div>
          <div style={fieldStyle}><label style={labelStyle}>Amount</label><FormattedNumberInput style={inputStyle} decimals={2} value={header.amount} disabled={!canEdit} onChange={(nextValue) => setHeader((c) => ({ ...c, amount: nextValue }))} /></div>
          <div style={fieldStyle}><label style={labelStyle}>Invoice Balance</label><input style={inputStyle} value={selectedInvoice ? formatMoney(selectedInvoice.balanceDue) : ""} disabled /></div>
          <div style={{ ...fieldStyle, gridColumn: "1 / -1" }}><label style={labelStyle}>Remarks</label><textarea style={{ ...inputStyle, minHeight: "90px", resize: "vertical" }} value={header.remarks} disabled={!canEdit} onChange={(event) => setHeader((c) => ({ ...c, remarks: event.target.value }))} /></div>
        </div>
      </FormCard>
      <ActionButtons actions={[
        { label: "Cancel", variant: "secondary", onClick: () => router.push(cancelHref), disabled: isBusy },
        { label: "Save Draft", variant: "secondary", onClick: () => save("DRAFT"), loading: savingKey === "DRAFT", loadingLabel: "Saving...", disabled: !canEdit },
        { label: "Submit for Approval", variant: "primary", onClick: () => save("SUBMITTED"), loading: savingKey === "SUBMITTED", loadingLabel: "Submitting...", disabled: !canEdit },
      ]} />
    </div>
  );
}

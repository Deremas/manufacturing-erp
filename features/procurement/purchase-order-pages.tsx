"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, FileText, PackagePlus, Pencil, Send } from "lucide-react";

import {
  ActionButtons,
  DataTable,
  DecoratedSelect,
  EmptyState,
  MetricCard,
  PageHeader,
  SearchInput,
  StatusBadge,
} from "@/components/shared";
import type { Action, Breadcrumb, Column, TableAction } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { useProcurementApprovalDialog } from "./approval-controls";
import {
  procurementCreateUrl,
  procurementEditUrl,
  procurementViewUrl,
} from "@/lib/procurement/routes";

type PurchaseOrderRow = {
  id: string;
  publicId: number;
  number: string;
  date: string;
  status: string;
  supplierId: string;
  primary: string;
  secondary: string;
  owner: string;
  itemCount: number;
  subtotal: number;
  taxAmount: number;
  amount: number;
};

const cardStyle: React.CSSProperties = {
  backgroundColor: colors.surface,
  border: `1px solid ${colors.border}`,
  borderRadius: radius.components.card,
  padding: `${spacing.card.padding}px`,
};

import { useSystemPreferences } from "@/lib/client/use-system-preferences";
import { formatMoney } from "@/lib/utils/format-number";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", { dateStyle: "medium" }).format(new Date(value));
}

function badgeForStatus(status: string) {
  switch (String(status).toUpperCase()) {
    case "APPROVED":
    case "POSTED":
    case "RECEIVED":
      return "posted";
    case "REJECTED":
    case "CANCELLED":
      return "voided";
    case "SUBMITTED":
    case "PARTIALLY_RECEIVED":
      return "pending";
    default:
      return "draft";
  }
}

function formatStatusLabel(status: string) {
  return String(status)
    .replaceAll("_", " ")
    .toLowerCase()
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function countByStatus(rows: PurchaseOrderRow[], statuses: string[]) {
  return rows.filter((row) => statuses.includes(String(row.status).toUpperCase())).length;
}

export function PurchaseOrderListPage({
  title,
  subtitle,
  breadcrumbs,
  createHref,
  rows,
  suppliers,
  apiBasePath = "/api/procurement/purchase-orders",
}: {
  title: string;
  subtitle: string;
  breadcrumbs: Breadcrumb[];
  createHref: string;
  rows: PurchaseOrderRow[];
  suppliers: Array<{ value: string; label: string }>;
  apiBasePath?: string;
}) {
  const router = useRouter();
  const { currencyCode } = useSystemPreferences();
  const [search, setSearch] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const approval = useProcurementApprovalDialog({ apiBasePath });

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return rows.filter((row) => {
      if (supplierId && row.supplierId !== supplierId) {
        return false;
      }
      if (statusFilter && String(row.status).toUpperCase() !== statusFilter) {
        return false;
      }
      if (!query) return true;
      return [row.number, row.primary, row.secondary, row.owner, row.status]
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [rows, search, statusFilter, supplierId, suppliers]);

  const metrics = useMemo(() => ({
    total: rows.length,
    draft: countByStatus(rows, ["DRAFT"]),
    pending: countByStatus(rows, ["SUBMITTED"]),
    approved: countByStatus(rows, ["APPROVED"]),
    received: countByStatus(rows, ["RECEIVED", "PARTIALLY_RECEIVED", "POSTED"]),
    totalValue: rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0),
  }), [rows]);

  const workflow = [
    { label: "Draft", count: metrics.draft, color: colors.secondary[500] },
    { label: "Pending", count: metrics.pending, color: colors.warning[500] },
    { label: "Approved", count: metrics.approved, color: colors.primary[500] },
    { label: "Received", count: metrics.received, color: colors.success[500] },
  ];

  const columns: Column<PurchaseOrderRow>[] = [
    {
      key: "number",
      label: "PO Number",
      sortable: true,
      render: (_value, record) => (
        <a href={procurementViewUrl("po", record.publicId)} style={{ color: colors.primary[600], fontWeight: 600, textDecoration: "none" }}>
          {record.number}
        </a>
      ),
    },
    { key: "date", label: "Date", render: (value) => formatDate(String(value)) },
    { key: "primary", label: "Supplier" },
    { key: "secondary", label: "Receiving Location" },
    {
      key: "subtotal",
      label: "Subtotal",
      render: (value) => formatMoney(Number(value ?? 0), currencyCode),
    },
    {
      key: "taxAmount",
      label: "VAT",
      render: (value) => formatMoney(Number(value ?? 0), currencyCode),
    },
    {
      key: "amount",
      label: "Total",
      render: (value) => formatMoney(Number(value ?? 0), currencyCode),
    },
    {
      key: "status",
      label: "Status",
      render: (value) => (
        <StatusBadge status={badgeForStatus(String(value)) as never} label={formatStatusLabel(String(value))} />
      ),
    },
  ];

  const locked = (status: string, values: string[]) => values.includes(String(status).toUpperCase());

  const actions: TableAction[] = [
    { label: "View", icon: <Eye size={16} />, onClick: (record) => { router.push(procurementViewUrl("po", (record as PurchaseOrderRow).publicId)); } },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      show: (record) => !locked(String((record as PurchaseOrderRow).status), ["RECEIVED", "POSTED", "CANCELLED"]),
      onClick: (record) => { router.push(procurementEditUrl("po", (record as PurchaseOrderRow).publicId)); },
    },
    {
      label: "Create GRN",
      icon: <PackagePlus size={16} />,
      show: (record) => locked(String((record as PurchaseOrderRow).status), ["APPROVED", "PARTIALLY_RECEIVED"]),
      onClick: (record) => { router.push(procurementCreateUrl("grn", { poPublicId: (record as PurchaseOrderRow).publicId })); },
    },
    {
      label: "Create Invoice",
      icon: <FileText size={16} />,
      show: (record) => locked(String((record as PurchaseOrderRow).status), ["APPROVED", "PARTIALLY_RECEIVED", "RECEIVED", "POSTED"]),
      onClick: (record) => { router.push(procurementCreateUrl("invoice", { poPublicId: (record as PurchaseOrderRow).publicId })); },
    },
    ...approval.actions,
  ];

  const pageActions: Action[] = [
    { label: "New Order", variant: "primary", icon: <Send size={16} />, onClick: () => { router.push(createHref); } },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader title={title} subtitle={subtitle} breadcrumbs={breadcrumbs} actions={<ActionButtons actions={pageActions} />} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: spacing.card.gap }}>
        <MetricCard label="Total Orders" value={metrics.total} borderColor={colors.primary[500]} />
        <MetricCard label="Draft" value={metrics.draft} borderColor={colors.secondary[500]} />
        <MetricCard label="Pending Approval" value={metrics.pending} borderColor={colors.warning[500]} />
        <MetricCard label="Approved" value={metrics.approved} borderColor={colors.primary[600]} />
        <MetricCard label="Received" value={metrics.received} borderColor={colors.success[500]} />
        <MetricCard label="Total Value" value={formatMoney(metrics.totalValue, currencyCode)} borderColor={colors.success[600]} />
      </div>

      <div style={cardStyle}>
        <div style={{ marginBottom: 12, fontWeight: 700, color: colors.text.primary }}>Order Workflow Status</div>
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${workflow.length}, minmax(0, 1fr))`, gap: 8 }}>
          {workflow.map((step) => (
            <div key={step.label} style={{ textAlign: "center", padding: "10px 8px", borderRadius: 10, background: "#f8fafc", border: `1px solid ${colors.border}` }}>
              <div style={{ fontSize: typography.sizes.caption.fontSize, color: colors.text.secondary, marginBottom: 4 }}>{step.label}</div>
              <div style={{ fontSize: typography.sizes.h5.fontSize, fontWeight: 700, color: step.color }}>{step.count}</div>
            </div>
          ))}
        </div>
      </div>

      <div style={cardStyle}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 12 }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search purchase orders..." />
          <DecoratedSelect
            value={supplierId}
            placeholder="All Suppliers"
            onChange={setSupplierId}
            options={suppliers}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${colors.inputBorder}`, borderRadius: radius.components.input }}
          />
          <DecoratedSelect
            value={statusFilter}
            placeholder="All Status"
            onChange={setStatusFilter}
            options={[
              { value: "DRAFT", label: "Draft" },
              { value: "SUBMITTED", label: "Pending Approval" },
              { value: "APPROVED", label: "Approved" },
              { value: "PARTIALLY_RECEIVED", label: "Partially Received" },
              { value: "RECEIVED", label: "Received" },
              { value: "CANCELLED", label: "Cancelled" },
            ]}
            style={{ width: "100%", padding: "10px 12px", border: `1px solid ${colors.inputBorder}`, borderRadius: radius.components.input }}
          />
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        actions={actions}
        pageSize={15}
        emptyState={<EmptyState title="No Purchase Orders" message="There are no purchase orders recorded yet." />}
      />
      {approval.dialog}
    </div>
  );
}

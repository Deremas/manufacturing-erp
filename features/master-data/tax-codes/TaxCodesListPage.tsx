"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
  MetricCard,
  FilterCard,
  DataTable,
  StatusBadge,
  EmptyState,
  ActionButtons,
} from "@/components/shared";
import type {
  Breadcrumb,
  FilterField,
  Column,
  TableAction,
  Action,
} from "@/components/shared";
import type { TaxCode } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { Eye, Pencil, Trash2, Receipt, CheckCircle, XCircle } from "lucide-react";
import { deleteRecord } from "@/lib/client/record-actions";

export interface TaxCodesListPageProps {
  initialData?: TaxCode[];
}

export default function TaxCodesListPage({
  initialData = [],
}: TaxCodesListPageProps) {
  const router = useRouter();
  const [data] = useState<TaxCode[]>(initialData);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Tax Codes" },
  ];

  const taxTypeOptions = useMemo(
    () =>
      Array.from(new Set(data.map((taxCode) => taxCode.taxType))).map((value) => ({
        label: value,
        value,
      })),
    [data],
  );

  const filterFields: FilterField[] = [
    { type: "text", key: "search", label: "Search", placeholder: "Search by tax name..." },
    { type: "select", key: "type", label: "Type", placeholder: "All Types", options: taxTypeOptions },
    {
      type: "select",
      key: "status",
      label: "Status",
      placeholder: "All Statuses",
      options: [
        { label: "Active", value: "true" },
        { label: "Inactive", value: "false" },
      ],
    },
  ];

  const columns: Column<TaxCode>[] = [
    { key: "taxName", label: "Name", sortable: true },
    {
      key: "taxType",
      label: "Type",
      sortable: true,
      render: (value) => (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            padding: "2px 8px",
            borderRadius: "6px",
            backgroundColor: colors.primary[50],
            color: colors.primary[700],
            fontFamily: typography.fontFamily,
            fontSize: typography.sizes.caption.fontSize,
            fontWeight: typography.weights.medium,
          }}
        >
          {value as string}
        </span>
      ),
    },
    { key: "rate", label: "Rate %", sortable: true, render: (value) => `${value}%` },
    {
      key: "isActive",
      label: "Status",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
    },
  ];

  const handleCreate = () => router.push(window.location.pathname + "/create");

  const tableActions: TableAction[] = [
    { label: "View", icon: <Eye size={16} />, onClick: (record) => router.push(window.location.pathname + "/" + record.id) },
    { label: "Edit", icon: <Pencil size={16} />, onClick: (record) => router.push(window.location.pathname + "/" + record.id + "/edit") },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        try {
          await deleteRecord(
            `/api/records/master-data/tax-codes/${record.id}`,
            "tax code",
          );
          router.refresh();
        } catch (error) {
          console.error(error);
          alert(error instanceof Error ? error.message : "Failed to delete tax code");
        }
      },
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<Receipt size={36} />}
      title="No Tax Codes Found"
      message="There are no tax codes to display. Create your first tax code to get started."
      action={{ label: "Create Tax Code", onClick: handleCreate }}
    />
  );

  const pageActions: Action[] = [
    { label: "Create Tax Code", variant: "primary", onClick: handleCreate },
  ];

  const totalCodes = data.length;
  const activeCodes = data.filter((t) => t.isActive).length;
  const inactiveCodes = data.filter((t) => !t.isActive).length;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Tax Codes"
        subtitle="Manage VAT, excise, withholding tax rates and other tax configurations."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "16px" }}>
        <MetricCard label="Total Tax Codes" value={totalCodes} icon={<Receipt size={18} />} borderColor={colors.primary[500]} />
        <MetricCard label="Active" value={activeCodes} icon={<CheckCircle size={18} />} borderColor={colors.success[500]} color={colors.success[700]} />
        <MetricCard label="Inactive" value={inactiveCodes} icon={<XCircle size={18} />} borderColor={colors.danger[500]} color={colors.danger[700]} />
      </div>

      <FilterCard title="Filter Tax Codes" fields={filterFields} onFilter={(values) => console.log("Filter values", values)} onReset={() => undefined} />

      <DataTable columns={columns} data={data} actions={tableActions} emptyState={emptyState} recordCount={data.length} />
    </div>
  );
}

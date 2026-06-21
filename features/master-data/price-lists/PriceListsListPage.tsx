"use client";

import React, { useState } from "react";
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
import type { PriceList } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import {
  Eye,
  Pencil,
  Trash2,
  BadgeDollarSign,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { deleteRecord } from "@/lib/client/record-actions";

export interface PriceListsListPageProps {
  initialData?: PriceList[];
}

const customerGroupOptions = [
  { label: "Retail", value: "Retail" },
  { label: "Wholesale", value: "Wholesale" },
  { label: "Distributor", value: "Distributor" },
  { label: "Export", value: "Export" },
];

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(value);
};

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
};

const metricsRowStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(3, 1fr)",
  gap: "16px",
};

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function PriceListsListPage({
  initialData = [],
}: PriceListsListPageProps) {
  const router = useRouter();
  const [data] = useState<PriceList[]>(initialData);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Master Data", href: "/master-data" },
    { label: "Price Lists" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by item name or customer group...",
    },
    {
      type: "select",
      key: "customerGroup",
      label: "Customer Group",
      placeholder: "All Groups",
      options: customerGroupOptions,
    },
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

  const columns: Column<PriceList>[] = [
    {
      key: "itemName",
      label: "Item",
      sortable: true,
      render: (value) => value ?? "\u2014",
    },
    { key: "customerGroup", label: "Customer Group", sortable: true },
    {
      key: "price",
      label: "Price",
      sortable: true,
      render: (value) => formatCurrency(value as number),
    },
    {
      key: "effectiveDate",
      label: "Effective Date",
      sortable: true,
      render: (value) =>
        value
          ? new Date(value as string).toLocaleDateString("en-US", {
              year: "numeric",
              month: "short",
              day: "numeric",
            })
          : "\u2014",
    },
    {
      key: "isActive",
      label: "Status",
      render: (value) => <StatusBadge status={value ? "active" : "inactive"} />,
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "View",
      icon: <Eye size={16} />,
      onClick: (record) => router.push(window.location.pathname + "/" + record.id),
    },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      onClick: (record) => router.push(window.location.pathname + "/" + record.id + "/edit"),
    },
    {
      label: "Delete",
      icon: <Trash2 size={16} />,
      color: colors.danger[600],
      onClick: async (record) => {
        try {
          await deleteRecord(
            `/api/records/master-data/price-lists/${record.id}`,
            "price list",
          );
          router.refresh();
        } catch (error) {
          console.error(error);
          alert(
            error instanceof Error ? error.message : "Failed to delete price list",
          );
        }
      },
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<BadgeDollarSign size={36} />}
      title="No Price Lists Found"
      message="There are no price lists to display. Create your first price list to get started."
      action={{
        label: "Create Price List",
        onClick: () => router.push(window.location.pathname + "/create"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Create Price List",
      variant: "primary",
      onClick: () => router.push(window.location.pathname + "/create"),
    },
  ];

  const handleFilter = (values: Record<string, string>) => {
    console.log("Filter values", values);
  };

  const handleReset = () => {
    console.log("Filters reset");
  };

  const totalItems = data.length;
  const activeItems = data.filter((p) => p.isActive).length;
  const inactiveItems = data.filter((p) => !p.isActive).length;

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Price Lists"
        subtitle="Manage pricing for items across different customer groups and effective periods."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      {/* Metric Cards */}
      <div style={metricsRowStyle}>
        <MetricCard
          label="Total Prices"
          value={totalItems}
          icon={<BadgeDollarSign size={18} />}
          borderColor={colors.primary[500]}
        />
        <MetricCard
          label="Active"
          value={activeItems}
          icon={<CheckCircle size={18} />}
          borderColor={colors.success[500]}
          color={colors.success[700]}
        />
        <MetricCard
          label="Inactive"
          value={inactiveItems}
          icon={<XCircle size={18} />}
          borderColor={colors.danger[500]}
          color={colors.danger[700]}
        />
      </div>

      <FilterCard
        title="Filter Price Lists"
        fields={filterFields}
        onFilter={handleFilter}
        onReset={handleReset}
      />

      <DataTable
        columns={columns}
        data={data}
        actions={tableActions}
        emptyState={emptyState}
        recordCount={data.length}
      />
    </div>
  );
}

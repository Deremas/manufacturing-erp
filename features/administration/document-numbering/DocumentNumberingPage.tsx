"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  PageHeader,
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
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { Eye, Pencil, FileDigit } from "lucide-react";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface DocNumberingConfig {
  id: string;
  module: string;
  documentType: string;
  prefix: string;
  currentNumber: number;
  padding: number;
  resetRule: string;
  includeYear: boolean;
  includeMonth: boolean;
  includeLocation: boolean;
  preview: string;
  isActive: boolean;
}

export interface DocumentNumberingPageProps {
  initialData?: DocNumberingConfig[];
}

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.page.gap}px`,
};

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function DocumentNumberingPage({
  initialData = [],
}: DocumentNumberingPageProps) {
  const router = useRouter();
  const [data] = useState<DocNumberingConfig[]>(initialData);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Document Numbering" },
  ];

  const filterFields: FilterField[] = [
    {
      type: "text",
      key: "search",
      label: "Search",
      placeholder: "Search by module or document type...",
    },
    {
      type: "select",
      key: "module",
      label: "Module",
      placeholder: "All Modules",
      options: [
        { label: "Procurement", value: "Procurement" },
        { label: "Inventory", value: "Inventory" },
        { label: "Production", value: "Production" },
        { label: "Sales", value: "Sales" },
        { label: "Finance", value: "Finance" },
      ],
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

  const columns: Column<DocNumberingConfig>[] = [
    {
      key: "module",
      label: "Module",
      sortable: true,
      render: (value) => (
        <span style={{ fontWeight: typography.weights.medium }}>
          {value as string}
        </span>
      ),
    },
    { key: "documentType", label: "Document Type", sortable: true },
    {
      key: "prefix",
      label: "Prefix",
      render: (value) => (
        <code
          style={{
            padding: "2px 6px",
            backgroundColor: "#f3f4f6",
            borderRadius: "4px",
            fontSize: "13px",
          }}
        >
          {value as string}
        </code>
      ),
    },
    { key: "currentNumber", label: "Current #" },
    { key: "padding", label: "Padding" },
    { key: "resetRule", label: "Reset Rule" },
    {
      key: "preview",
      label: "Preview",
      render: (value) => (
        <code
          style={{
            padding: "2px 8px",
            backgroundColor: colors.primary[50],
            color: colors.primary[700],
            borderRadius: "4px",
            fontSize: "12px",
            fontWeight: typography.weights.medium,
          }}
        >
          {value as string}
        </code>
      ),
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
      onClick: (record) => console.log("View", record.id),
    },
    {
      label: "Edit",
      icon: <Pencil size={16} />,
      onClick: (record) => console.log("Edit", record.id),
    },
  ];

  const emptyState = (
    <EmptyState
      icon={<FileDigit size={36} />}
      title="No Configurations Found"
      message="There are no document numbering configurations. Create one to get started."
      action={{
        label: "Create Configuration",
        onClick: () => console.log("Create"),
      }}
    />
  );

  const pageActions: Action[] = [
    {
      label: "Create Configuration",
      variant: "primary",
      onClick: () => router.push(window.location.pathname + "/create"),
    },
  ];

  const handleFilter = (values: Record<string, string>) =>
    console.log("Filter", values);
  const handleReset = () => console.log("Reset");

  return (
    <div style={pageStyle}>
      <PageHeader
        title="Document Numbering"
        subtitle="Configure document numbering sequences for each module."
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />
      <FilterCard
        title="Filter Configurations"
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

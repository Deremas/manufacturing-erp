"use client";

import React, { useState } from "react";
import {
  PageHeader,
  DataTable,
  EmptyState,
  ActionButtons,
} from "@/components/shared";
import type {
  Breadcrumb,
  Column,
  TableAction,
  Action,
} from "@/components/shared";
import type { DocumentNumberingConfig } from "../types";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

// ----------------------------------------------------------------------------
// Mock Data — 17 document prefixes
// ----------------------------------------------------------------------------
const mockConfigs: (DocumentNumberingConfig & { documentType: string })[] = [
  {
    documentType: "Purchase Order",
    prefix: "PO",
    prefixFormat: "PO",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 1245,
    example: "PO-2026-01245",
  },
  {
    documentType: "Goods Receipt Note",
    prefix: "GRN",
    prefixFormat: "GRN",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 876,
    example: "GRN-2026-00876",
  },
  {
    documentType: "Purchase Requisition",
    prefix: "PR",
    prefixFormat: "PR",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 543,
    example: "PR-2026-00543",
  },
  {
    documentType: "Transfer Request",
    prefix: "TRF",
    prefixFormat: "TRF",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 321,
    example: "TRF-2026-00321",
  },
  {
    documentType: "Stock Adjustment",
    prefix: "ADJ",
    prefixFormat: "ADJ",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 198,
    example: "ADJ-2026-00198",
  },
  {
    documentType: "Production Order",
    prefix: "PROD",
    prefixFormat: "PROD",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 456,
    example: "PROD-2026-00456",
  },
  {
    documentType: "Quality Control",
    prefix: "QC",
    prefixFormat: "QC",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 289,
    example: "QC-2026-00289",
  },
  {
    documentType: "Sales Order",
    prefix: "SALE",
    prefixFormat: "SALE",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 1567,
    example: "SALE-2026-01567",
  },
  {
    documentType: "Final Sale (Invoice)",
    prefix: "FS",
    prefixFormat: "FS",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 1123,
    example: "FS-2026-01123",
  },
  {
    documentType: "Order (General)",
    prefix: "ORD",
    prefixFormat: "ORD",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 892,
    example: "ORD-2026-00892",
  },
  {
    documentType: "Work Order",
    prefix: "WO",
    prefixFormat: "WO",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 634,
    example: "WO-2026-00634",
  },
  {
    documentType: "Asset",
    prefix: "AST",
    prefixFormat: "AST",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 167,
    example: "AST-2026-00167",
  },
  {
    documentType: "Voucher",
    prefix: "V",
    prefixFormat: "V",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 2891,
    example: "V-2026-02891",
  },
  {
    documentType: "Transport / Waybill",
    prefix: "TRP",
    prefixFormat: "TRP",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 445,
    example: "TRP-2026-00445",
  },
  {
    documentType: "Payment",
    prefix: "PAY",
    prefixFormat: "PAY",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 978,
    example: "PAY-2026-00978",
  },
  {
    documentType: "Expense",
    prefix: "EXP",
    prefixFormat: "EXP",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 756,
    example: "EXP-2026-00756",
  },
  {
    documentType: "Report",
    prefix: "RPT",
    prefixFormat: "RPT",
    separator: "-",
    yearFormat: "YYYY",
    sequenceLength: 5,
    currentSequence: 312,
    example: "RPT-2026-00312",
  },
];

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const prefixBadgeStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "2px 10px",
  borderRadius: radius.components.badge,
  backgroundColor: colors.primary[100],
  color: colors.primary[700],
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.caption.fontSize,
  fontWeight: typography.weights.semibold,
  border: `1px solid ${colors.primary[200]}`,
  letterSpacing: "0.5px",
};

const formatCodeStyle: React.CSSProperties = {
  fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, monospace",
  fontSize: typography.sizes.caption.fontSize,
  color: colors.text.secondary,
  backgroundColor: colors.secondary[50],
  padding: "3px 8px",
  borderRadius: radius.scale.xs,
  border: `1px solid ${colors.border}`,
};

// ----------------------------------------------------------------------------
// Page Component
// ----------------------------------------------------------------------------
export default function DocumentNumberingPage() {
  const [data] = useState(mockConfigs);

  const breadcrumbs: Breadcrumb[] = [
    { label: "Administration", href: "/administration" },
    { label: "Document Numbering" },
  ];

  const columns: Column<(typeof mockConfigs)[number]>[] = [
    { key: "documentType", label: "Document Type", sortable: true },
    {
      key: "prefix",
      label: "Prefix",
      render: (value) => (
        <span style={prefixBadgeStyle}>{value as string}</span>
      ),
    },
    {
      key: "prefixFormat",
      label: "Format",
      render: (value, record) => {
        const r = record as (typeof mockConfigs)[number];
        const format = `${r.prefix}${r.separator}${r.yearFormat}${r.separator}${"9".repeat(r.sequenceLength)}`;
        return <span style={formatCodeStyle}>{format}</span>;
      },
    },
    {
      key: "currentSequence",
      label: "Current Number",
      sortable: true,
      render: (value) =>
        String(value as number).padStart(mockConfigs[0].sequenceLength, "0"),
    },
    {
      key: "example",
      label: "Example",
      render: (value) => <span style={formatCodeStyle}>{value as string}</span>,
    },
  ];

  const tableActions: TableAction[] = [
    {
      label: "Edit",
      onClick: (record) =>
        console.log("Edit numbering config", record.id ?? record.prefix),
    },
  ];

  const emptyState = (
    <EmptyState
      title="No Document Numbering Configurations"
      message="There are no document numbering configurations to display."
    />
  );

  const pageActions: Action[] = [
    {
      label: "Manage Prefixes",
      variant: "primary",
      onClick: () => console.log("Manage Prefixes"),
    },
  ];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        title="Document Numbering"
        breadcrumbs={breadcrumbs}
        actions={<ActionButtons actions={pageActions} />}
      />

      <p
        style={{
          fontFamily: typography.fontFamily,
          fontSize: typography.sizes.body.fontSize,
          color: colors.text.secondary,
          margin: 0,
        }}
      >
        Configure numbering sequences for all document types. The format follows
        the pattern:{" "}
        <code
          style={{
            backgroundColor: colors.secondary[100],
            padding: "2px 6px",
            borderRadius: radius.scale.xs,
          }}
        >
          PREFIX-SEPARATOR-YEAR-SEPARATOR-SEQUENCE
        </code>
        .
      </p>

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

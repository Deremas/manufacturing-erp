"use client";

import React from "react";
import {
  HeroBanner,
  MetricCard,
  DataTable,
  PageHeader,
} from "@/components/shared";
import type { Column } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";
import { spacing } from "@/components/ui/spacing";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
interface StockMovement {
  id: string;
  item: string;
  type: string;
  quantity: number;
  date: string;
  status: string;
}

interface PendingApproval {
  id: string;
  document: string;
  type: string;
  requestedBy: string;
  date: string;
  amount: string;
}

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
const mockStockMovements: StockMovement[] = [
  {
    id: "1",
    item: "Steel Plate A36",
    type: "GRN",
    quantity: 500,
    date: "2025-06-17",
    status: "completed",
  },
  {
    id: "2",
    item: "Copper Wire 12AWG",
    type: "ISSUE",
    quantity: 50,
    date: "2025-06-17",
    status: "completed",
  },
  {
    id: "3",
    item: "Aluminum Sheet 6061",
    type: "TRANSFER",
    quantity: 200,
    date: "2025-06-16",
    status: "completed",
  },
  {
    id: "4",
    item: "Brass Rod 20mm",
    type: "GRN",
    quantity: 100,
    date: "2025-06-16",
    status: "pending",
  },
  {
    id: "5",
    item: 'Stainless Pipe 4"',
    type: "ISSUE",
    quantity: 30,
    date: "2025-06-15",
    status: "completed",
  },
];

const mockPendingApprovals: PendingApproval[] = [
  {
    id: "PA-001",
    document: "PO-2025-0042",
    type: "Purchase Order",
    requestedBy: "Jane Smith",
    date: "2025-06-17",
    amount: "$12,500",
  },
  {
    id: "PA-002",
    document: "PR-2025-0018",
    type: "Purchase Requisition",
    requestedBy: "Mike Johnson",
    date: "2025-06-16",
    amount: "$3,200",
  },
  {
    id: "PA-003",
    document: "GRN-2025-0021",
    type: "Goods Receipt",
    requestedBy: "Sarah Lee",
    date: "2025-06-16",
    amount: "—",
  },
];

// ----------------------------------------------------------------------------
// Styles
// ----------------------------------------------------------------------------
const pageStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: `${spacing.card.gap}px`,
  padding: `${spacing.card.padding}px`,
};

const metricsGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
  gap: `${spacing.card.gap}px`,
};

const sectionTitleStyle: React.CSSProperties = {
  fontFamily: typography.fontFamily,
  fontSize: typography.sizes.h6.fontSize,
  fontWeight: typography.weights.semibold,
  color: colors.text.primary,
  margin: 0,
  marginBottom: "12px",
};

const twoColumnGridStyle: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: `${spacing.card.gap}px`,
};

// ----------------------------------------------------------------------------
// Columns
// ----------------------------------------------------------------------------
const movementColumns: Column<StockMovement>[] = [
  { key: "item", label: "Item", sortable: true },
  { key: "type", label: "Type" },
  { key: "quantity", label: "Quantity", sortable: true },
  { key: "date", label: "Date", sortable: true },
  { key: "status", label: "Status" },
];

const approvalColumns: Column<PendingApproval>[] = [
  { key: "document", label: "Document" },
  { key: "type", label: "Type" },
  { key: "requestedBy", label: "Requested By" },
  { key: "date", label: "Date" },
  { key: "amount", label: "Amount" },
];

// ----------------------------------------------------------------------------
// Dashboard Page
// ----------------------------------------------------------------------------
export default function DashboardPage() {
  const username = "John Doe";
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div style={pageStyle}>
      {/* Hero Banner */}
      <HeroBanner
        title="Welcome to NEW ERP"
        subtitle={`Good day, ${username} — ${today}`}
      />

      {/* Metric Cards */}
      <div style={metricsGridStyle}>
        <MetricCard
          label="Total Items"
          value="1,284"
          borderColor={colors.primary[500]}
          trend="up"
        />
        <MetricCard
          label="Active Suppliers"
          value="48"
          borderColor={colors.success[500]}
          subtitle="12 pending approval"
        />
        <MetricCard
          label="Open POs"
          value="23"
          borderColor={colors.warning[500]}
          subtitle="Value: $156,200"
        />
        <MetricCard
          label="Low Stock Items"
          value="7"
          borderColor={colors.danger[500]}
          trend="down"
        />
      </div>

      {/* Recent Activity + Pending Approvals */}
      <div style={twoColumnGridStyle}>
        <div>
          <h3 style={sectionTitleStyle}>Recent Activity</h3>
          <DataTable
            columns={movementColumns as Column[]}
            data={mockStockMovements as any}
            pageSize={5}
          />
        </div>
        <div>
          <h3 style={sectionTitleStyle}>Pending Approvals</h3>
          <DataTable
            columns={approvalColumns as Column[]}
            data={mockPendingApprovals as any}
            pageSize={5}
          />
        </div>
      </div>
    </div>
  );
}

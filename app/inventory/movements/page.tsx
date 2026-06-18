"use client";

import React from "react";
import { DataTable, PageHeader } from "@/components/shared";
import type { Column } from "@/components/shared";

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
interface StockMovement {
  id: string;
  date: string;
  reference: string;
  type: string;
  item: string;
  quantity: number;
  fromLocation: string;
  toLocation: string;
  user: string;
  status: string;
}

const mockMovements: StockMovement[] = [
  {
    id: "1",
    date: "2025-06-17",
    reference: "GRN-2025-0022",
    type: "Goods Receipt",
    item: "Steel Plate A36",
    quantity: 500,
    fromLocation: "—",
    toLocation: "Main Warehouse",
    user: "John Doe",
    status: "completed",
  },
  {
    id: "2",
    date: "2025-06-17",
    reference: "ISS-2025-0045",
    type: "Issue",
    item: "Copper Wire 12AWG",
    quantity: 50,
    fromLocation: "Main Warehouse",
    toLocation: "Production Line A",
    user: "Jane Smith",
    status: "completed",
  },
  {
    id: "3",
    date: "2025-06-16",
    reference: "TRF-2025-0012",
    type: "Transfer",
    item: "Aluminum Sheet 6061",
    quantity: 200,
    fromLocation: "Main Warehouse",
    toLocation: "Warehouse B",
    user: "Mike Johnson",
    status: "completed",
  },
  {
    id: "4",
    date: "2025-06-16",
    reference: "GRN-2025-0021",
    type: "Goods Receipt",
    item: "Brass Rod 20mm",
    quantity: 100,
    fromLocation: "—",
    toLocation: "Warehouse B",
    user: "Sarah Lee",
    status: "pending",
  },
  {
    id: "5",
    date: "2025-06-15",
    reference: "ISS-2025-0044",
    type: "Issue",
    item: 'Stainless Pipe 4"',
    quantity: 30,
    fromLocation: "Main Warehouse",
    toLocation: "Production Line B",
    user: "John Doe",
    status: "completed",
  },
  {
    id: "6",
    date: "2025-06-15",
    reference: "GRN-2025-0020",
    type: "Goods Receipt",
    item: "Fastener M10 Bolt",
    quantity: 1000,
    fromLocation: "—",
    toLocation: "Main Warehouse",
    user: "Jane Smith",
    status: "completed",
  },
  {
    id: "7",
    date: "2025-06-14",
    reference: "TRF-2025-0011",
    type: "Transfer",
    item: "Copper Wire 12AWG",
    quantity: 100,
    fromLocation: "Warehouse B",
    toLocation: "Main Warehouse",
    user: "Mike Johnson",
    status: "completed",
  },
];

// ----------------------------------------------------------------------------
// Columns
// ----------------------------------------------------------------------------
const columns: Column[] = [
  { key: "date", label: "Date", sortable: true },
  { key: "reference", label: "Reference" },
  { key: "type", label: "Type" },
  { key: "item", label: "Item", sortable: true },
  { key: "quantity", label: "Quantity", sortable: true },
  { key: "fromLocation", label: "From Location" },
  { key: "toLocation", label: "To Location" },
  { key: "user", label: "User" },
  { key: "status", label: "Status" },
];

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------
export default function StockMovementsPage() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "16px",
      }}
    >
      <PageHeader
        title="Stock Movements"
        subtitle="Track all stock transactions across the warehouse"
      />
      <DataTable
        columns={columns}
        data={mockMovements as unknown as Record<string, unknown>[]}
        pageSize={10}
      />
    </div>
  );
}

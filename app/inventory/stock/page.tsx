"use client";

import React from "react";
import { DataTable, PageHeader } from "@/components/shared";
import type { Column } from "@/components/shared";

// ----------------------------------------------------------------------------
// Mock Data
// ----------------------------------------------------------------------------
interface StockItem {
  id: string;
  code: string;
  name: string;
  category: string;
  warehouse: string;
  onHand: number;
  reserved: number;
  available: number;
  unit: string;
}

const mockStock: StockItem[] = [
  {
    id: "1",
    code: "STL-PL-A36",
    name: "Steel Plate A36",
    category: "Metals",
    warehouse: "Main Warehouse",
    onHand: 1500,
    reserved: 200,
    available: 1300,
    unit: "kg",
  },
  {
    id: "2",
    code: "CUP-WR-12",
    name: "Copper Wire 12AWG",
    category: "Electrical",
    warehouse: "Main Warehouse",
    onHand: 800,
    reserved: 100,
    available: 700,
    unit: "m",
  },
  {
    id: "3",
    code: "ALM-SH-6061",
    name: "Aluminum Sheet 6061",
    category: "Metals",
    warehouse: "Warehouse B",
    onHand: 600,
    reserved: 50,
    available: 550,
    unit: "pcs",
  },
  {
    id: "4",
    code: "BRS-RD-20",
    name: "Brass Rod 20mm",
    category: "Metals",
    warehouse: "Warehouse B",
    onHand: 300,
    reserved: 80,
    available: 220,
    unit: "kg",
  },
  {
    id: "5",
    code: "STN-PP-4",
    name: 'Stainless Pipe 4"',
    category: "Pipes",
    warehouse: "Main Warehouse",
    onHand: 200,
    reserved: 30,
    available: 170,
    unit: "pcs",
  },
];

// ----------------------------------------------------------------------------
// Columns
// ----------------------------------------------------------------------------
const columns: Column[] = [
  { key: "code", label: "Code", sortable: true },
  { key: "name", label: "Item Name", sortable: true },
  { key: "category", label: "Category" },
  { key: "warehouse", label: "Warehouse" },
  { key: "onHand", label: "On Hand", sortable: true },
  { key: "reserved", label: "Reserved" },
  { key: "available", label: "Available", sortable: true },
  { key: "unit", label: "Unit" },
];

// ----------------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------------
export default function StockBalancePage() {
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
        title="Stock Balance"
        subtitle="View current stock quantities across warehouses"
      />
      <DataTable
        columns={columns}
        data={mockStock as unknown as Record<string, unknown>[]}
        pageSize={10}
      />
    </div>
  );
}

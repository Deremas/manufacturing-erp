"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function PurchaseOrdersPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Purchase Orders" subtitle="Manage purchase orders" />
      <EmptyState title="Purchase Orders" message="Module coming soon." />
    </div>
  );
}

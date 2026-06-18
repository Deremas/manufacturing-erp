"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function StockAdjustmentsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Stock Adjustments"
        subtitle="Manage stock adjustments"
      />
      <EmptyState title="Stock Adjustments" message="Module coming soon." />
    </div>
  );
}

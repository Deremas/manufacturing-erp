"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function StockTransfersPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Stock Transfers"
        subtitle="Manage stock transfers between locations"
      />
      <EmptyState title="Stock Transfers" message="Module coming soon." />
    </div>
  );
}

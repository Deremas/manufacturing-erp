"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function GoodsReceiptsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Goods Receipts / GRN"
        subtitle="Manage goods received notes"
      />
      <EmptyState title="Goods Receipts / GRN" message="Module coming soon." />
    </div>
  );
}

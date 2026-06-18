"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function PointOfSalePage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Point of Sale" subtitle="Process sales transactions" />
      <EmptyState title="Point of Sale" message="Module coming soon." />
    </div>
  );
}

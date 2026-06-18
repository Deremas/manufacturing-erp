"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function ProductionBinCardsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Production Bin Cards"
        subtitle="View production bin cards"
      />
      <EmptyState title="Production Bin Cards" message="Module coming soon." />
    </div>
  );
}

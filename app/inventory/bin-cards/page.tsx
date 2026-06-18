"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function BinCardsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Bin Cards" subtitle="View inventory bin cards" />
      <EmptyState title="Bin Cards" message="Module coming soon." />
    </div>
  );
}

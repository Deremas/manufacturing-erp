"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function CashBookPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Cash Book" subtitle="Manage cash book entries" />
      <EmptyState title="Cash Book" message="Module coming soon." />
    </div>
  );
}

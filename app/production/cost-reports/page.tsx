"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function CostReportsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Cost Reports"
        subtitle="View production cost reports"
      />
      <EmptyState title="Cost Reports" message="Module coming soon." />
    </div>
  );
}

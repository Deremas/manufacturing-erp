"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function AgingReportsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Aging Reports"
        subtitle="View accounts aging reports"
      />
      <EmptyState title="Aging Reports" message="Module coming soon." />
    </div>
  );
}

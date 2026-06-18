"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function ReportsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Reports" subtitle="View system reports" />
      <EmptyState title="Reports" message="Module coming soon." />
    </div>
  );
}

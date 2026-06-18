"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function ShiftSessionsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Shift Sessions"
        subtitle="Manage production shift sessions"
      />
      <EmptyState title="Shift Sessions" message="Module coming soon." />
    </div>
  );
}

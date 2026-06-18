"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function PMSchedulePage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="PM Schedule"
        subtitle="Manage preventive maintenance schedules"
      />
      <EmptyState title="PM Schedule" message="Module coming soon." />
    </div>
  );
}

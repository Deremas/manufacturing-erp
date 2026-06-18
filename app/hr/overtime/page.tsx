"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function OvertimePage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Overtime" subtitle="Manage employee overtime" />
      <EmptyState title="Overtime" message="Module coming soon." />
    </div>
  );
}

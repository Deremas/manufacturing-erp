"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function CapInspectionPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Cap Inspection"
        subtitle="Manage cap quality inspections"
      />
      <EmptyState title="Cap Inspection" message="Module coming soon." />
    </div>
  );
}

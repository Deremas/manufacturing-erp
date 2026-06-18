"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function HandleInspectionPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Handle Inspection"
        subtitle="Manage handle quality inspections"
      />
      <EmptyState title="Handle Inspection" message="Module coming soon." />
    </div>
  );
}

"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function PreformInspectionPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Preform Inspection"
        subtitle="Manage preform quality inspections"
      />
      <EmptyState title="Preform Inspection" message="Module coming soon." />
    </div>
  );
}

"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function BillOfMaterialsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Bill of Materials"
        subtitle="Manage bill of materials"
      />
      <EmptyState title="Bill of Materials" message="Module coming soon." />
    </div>
  );
}

"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function WorkOrdersPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Work Orders"
        subtitle="Manage maintenance work orders"
      />
      <EmptyState title="Work Orders" message="Module coming soon." />
    </div>
  );
}

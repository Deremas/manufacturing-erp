"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function UnitConversionsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Unit Conversions"
        subtitle="Manage unit conversion factors"
      />
      <EmptyState title="Unit Conversions" message="Module coming soon." />
    </div>
  );
}

"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function FuelRecordsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Fuel Records" subtitle="Manage fleet fuel records" />
      <EmptyState title="Fuel Records" message="Module coming soon." />
    </div>
  );
}

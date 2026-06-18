"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function VehiclesPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Vehicles" subtitle="Manage fleet vehicles" />
      <EmptyState title="Vehicles" message="Module coming soon." />
    </div>
  );
}

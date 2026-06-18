"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function TruckSalesPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Truck Sales" subtitle="Manage truck sales" />
      <EmptyState title="Truck Sales" message="Module coming soon." />
    </div>
  );
}

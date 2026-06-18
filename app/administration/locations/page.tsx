"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function LocationsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Locations" subtitle="Manage system locations" />
      <EmptyState title="Locations" message="Module coming soon." />
    </div>
  );
}

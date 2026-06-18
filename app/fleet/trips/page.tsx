"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function TripsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Trips" subtitle="Manage fleet trips" />
      <EmptyState title="Trips" message="Module coming soon." />
    </div>
  );
}

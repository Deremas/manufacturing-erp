"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function ColorsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Colors" subtitle="Manage color master data" />
      <EmptyState title="Colors" message="Module coming soon." />
    </div>
  );
}

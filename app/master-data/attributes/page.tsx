"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function AttributesPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Attributes" subtitle="Manage product attributes" />
      <EmptyState title="Attributes" message="Module coming soon." />
    </div>
  );
}

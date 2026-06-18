"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function SizesPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Sizes" subtitle="Manage size master data" />
      <EmptyState title="Sizes" message="Module coming soon." />
    </div>
  );
}

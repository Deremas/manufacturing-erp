"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function WaterTestPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Water Test" subtitle="Manage water quality tests" />
      <EmptyState title="Water Test" message="Module coming soon." />
    </div>
  );
}

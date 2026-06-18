"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function CostSettingsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Cost Settings"
        subtitle="Configure production cost settings"
      />
      <EmptyState title="Cost Settings" message="Module coming soon." />
    </div>
  );
}

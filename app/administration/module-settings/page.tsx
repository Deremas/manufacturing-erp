"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function ModuleSettingsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Module Settings"
        subtitle="Configure module-level settings"
      />
      <EmptyState title="Module Settings" message="Module coming soon." />
    </div>
  );
}

"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function PrintSettingsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Print Settings"
        subtitle="Configure print templates and settings"
      />
      <EmptyState title="Print Settings" message="Module coming soon." />
    </div>
  );
}

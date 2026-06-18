"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function FinanceSettingsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Finance Settings"
        subtitle="Configure finance settings"
      />
      <EmptyState title="Finance Settings" message="Module coming soon." />
    </div>
  );
}

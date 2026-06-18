"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function PayrollSettingsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Payroll Settings"
        subtitle="Configure payroll settings"
      />
      <EmptyState title="Payroll Settings" message="Module coming soon." />
    </div>
  );
}

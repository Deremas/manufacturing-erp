"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function EfficiencyReportPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Efficiency Report"
        subtitle="View production efficiency reports"
      />
      <EmptyState title="Efficiency Report" message="Module coming soon." />
    </div>
  );
}

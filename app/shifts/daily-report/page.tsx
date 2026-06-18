"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function DailyReportPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Daily Report" subtitle="View shift daily reports" />
      <EmptyState title="Daily Report" message="Module coming soon." />
    </div>
  );
}

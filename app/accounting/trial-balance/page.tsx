"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function TrialBalancePage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Trial Balance" subtitle="View trial balance" />
      <EmptyState title="Trial Balance" message="Module coming soon." />
    </div>
  );
}

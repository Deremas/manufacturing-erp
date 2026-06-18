"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function JournalEntriesPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Journal Entries" subtitle="Manage journal entries" />
      <EmptyState title="Journal Entries" message="Module coming soon." />
    </div>
  );
}

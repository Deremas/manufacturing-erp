"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function GeneralLedgerPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="General Ledger" subtitle="View general ledger" />
      <EmptyState title="General Ledger" message="Module coming soon." />
    </div>
  );
}

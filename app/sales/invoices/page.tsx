"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function SalesHistoryPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Sales History / Invoices"
        subtitle="View sales history and invoices"
      />
      <EmptyState
        title="Sales History / Invoices"
        message="Module coming soon."
      />
    </div>
  );
}

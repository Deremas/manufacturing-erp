"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function FinancialStatementsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Financial Statements"
        subtitle="View financial statements"
      />
      <EmptyState title="Financial Statements" message="Module coming soon." />
    </div>
  );
}

"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function ChartOfAccountsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Chart of Accounts"
        subtitle="Manage chart of accounts"
      />
      <EmptyState title="Chart of Accounts" message="Module coming soon." />
    </div>
  );
}

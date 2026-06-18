"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function IssueVouchersPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Issue Vouchers" subtitle="Manage issue vouchers" />
      <EmptyState title="Issue Vouchers" message="Module coming soon." />
    </div>
  );
}

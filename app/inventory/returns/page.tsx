"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function ReturnVouchersPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Return Vouchers" subtitle="Manage return vouchers" />
      <EmptyState title="Return Vouchers" message="Module coming soon." />
    </div>
  );
}

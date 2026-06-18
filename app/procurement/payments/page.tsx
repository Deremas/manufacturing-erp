"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function SupplierPaymentsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Supplier Payments"
        subtitle="Manage supplier payments"
      />
      <EmptyState title="Supplier Payments" message="Module coming soon." />
    </div>
  );
}

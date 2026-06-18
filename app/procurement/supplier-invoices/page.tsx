"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function SupplierInvoicesPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Supplier Invoices"
        subtitle="Manage supplier invoices"
      />
      <EmptyState title="Supplier Invoices" message="Module coming soon." />
    </div>
  );
}

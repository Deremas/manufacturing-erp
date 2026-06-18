"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function OrdersPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Orders" subtitle="Manage customer orders" />
      <EmptyState title="Orders" message="Module coming soon." />
    </div>
  );
}

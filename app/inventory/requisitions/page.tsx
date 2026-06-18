"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function StoreRequisitionsPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Store Requisitions"
        subtitle="Manage store requisitions"
      />
      <EmptyState title="Store Requisitions" message="Module coming soon." />
    </div>
  );
}

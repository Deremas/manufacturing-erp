"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function SRVCardPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="SRV Card" subtitle="Store received voucher card" />
      <EmptyState title="SRV Card" message="Module coming soon." />
    </div>
  );
}

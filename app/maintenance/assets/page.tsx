"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function AssetRegisterPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Asset Register"
        subtitle="Manage maintenance asset register"
      />
      <EmptyState title="Asset Register" message="Module coming soon." />
    </div>
  );
}

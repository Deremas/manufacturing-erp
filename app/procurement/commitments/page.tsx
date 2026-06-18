"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function CommitmentRegisterPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Commitment Register"
        subtitle="Track procurement commitments"
      />
      <EmptyState title="Commitment Register" message="Module coming soon." />
    </div>
  );
}

"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function MicrobialTestPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Microbial Test" subtitle="Manage microbial tests" />
      <EmptyState title="Microbial Test" message="Module coming soon." />
    </div>
  );
}

"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function ContainerTrackingPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Container Tracking"
        subtitle="Track sales containers"
      />
      <EmptyState title="Container Tracking" message="Module coming soon." />
    </div>
  );
}

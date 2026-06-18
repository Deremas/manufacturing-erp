"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function LeaveManagementPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader
        title="Leave Management"
        subtitle="Manage employee leave requests"
      />
      <EmptyState title="Leave Management" message="Module coming soon." />
    </div>
  );
}

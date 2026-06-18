"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function PayrollPage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Payroll" subtitle="Manage employee payroll" />
      <EmptyState title="Payroll" message="Module coming soon." />
    </div>
  );
}

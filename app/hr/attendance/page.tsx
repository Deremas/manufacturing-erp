"use client";

import PageHeader from "@/components/shared/PageHeader";
import EmptyState from "@/components/shared/EmptyState";

export default function AttendancePage() {
  return (
    <div
      style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24 }}
    >
      <PageHeader title="Attendance" subtitle="Manage employee attendance" />
      <EmptyState title="Attendance" message="Module coming soon." />
    </div>
  );
}

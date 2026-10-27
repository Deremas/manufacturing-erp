"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye } from "lucide-react";

import { DataTable, EmptyState, PageHeader, SearchInput, StatusBadge } from "@/components/shared";
import type { Column, TableAction } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { radius } from "@/components/ui/radius";
import { spacing } from "@/components/ui/spacing";
import type { ApprovalInboxRow } from "@/services/approval/approval-inbox.service";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-KE", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ApprovalInboxPage({
  rows,
}: {
  rows: ApprovalInboxRow[];
}) {
  const router = useRouter();
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.documentNo, row.documentLabel, row.requestedByName, row.assignedApproverName ?? ""]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const columns: Column<ApprovalInboxRow>[] = [
    {
      key: "documentNo",
      label: "Document No",
      sortable: true,
      render: (_value, record) => (
        <Link href={record.href} style={{ color: colors.primary[600], fontWeight: 600, textDecoration: "none" }}>
          {record.documentNo}
        </Link>
      ),
    },
    { key: "documentLabel", label: "Document Type", sortable: true },
    { key: "requestedByName", label: "Requested By" },
    {
      key: "assignedApproverName",
      label: "Assigned To",
      render: (value) => String(value ?? "Any approver"),
    },
    {
      key: "createdAt",
      label: "Submitted",
      sortable: true,
      render: (value) => formatDate(String(value)),
    },
    {
      key: "id",
      label: "Status",
      render: () => <StatusBadge status="pending" />,
    },
  ];

  const actions: TableAction[] = [
    {
      label: "View",
      icon: <Eye size={16} />,
      onClick: (record) => router.push((record as ApprovalInboxRow).href),
    },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        title="Approval Inbox"
        subtitle="Documents waiting for your approval across procurement and inventory workflows."
        breadcrumbs={[{ label: "Approval Inbox" }]}
      />

      <div style={{ padding: 16, border: `1px solid ${colors.border}`, borderRadius: radius.components.card, backgroundColor: colors.surface }}>
        <SearchInput value={search} onChange={setSearch} placeholder="Search pending approvals..." />
      </div>

      <DataTable
        columns={columns}
        data={filtered}
        actions={actions}
        pageSize={20}
        emptyState={(
          <EmptyState
            title="No pending approvals"
            message="You are all caught up. New submissions that match your approval permissions will appear here."
          />
        )}
      />
    </div>
  );
}

"use client";

import { DataTable } from "@/components/shared";
import type { Column, TableAction } from "@/components/shared";

export default function ReportTable<T>({
  columns,
  data,
  actions,
  emptyState,
  pageSize = 15,
}: {
  columns: Column<T>[];
  data: T[];
  actions?: TableAction[];
  emptyState?: React.ReactNode;
  pageSize?: number;
}) {
  return (
    <DataTable
      columns={columns}
      data={data}
      actions={actions}
      pageSize={pageSize}
      emptyState={emptyState}
    />
  );
}

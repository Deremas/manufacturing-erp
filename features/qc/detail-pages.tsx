"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { ActionButtons, DataTable, PageHeader } from "@/components/shared";
import type { Column } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { usePendingAction } from "@/lib/hooks/use-pending-action";

type QcTestDetail = NonNullable<Awaited<ReturnType<typeof import("@/services/qc/qc.service").getQcTestById>>>;

type QcTestAction = "approve" | "reject" | "hold";

export function QcTestDetailPage({ test }: { test: QcTestDetail }) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const { isLoading, isBusy, withPending } = usePendingAction<QcTestAction>();

  const summaryRows = [
    { label: "Test No", value: test.testNo },
    { label: "Test Type", value: test.testType },
    { label: "Sample Date", value: new Date(test.sampleDate).toLocaleDateString("en-KE") },
    { label: "Result", value: test.result },
    { label: "Status", value: test.status },
    { label: "Batch", value: test.batchNo ?? "-" },
    { label: "Item", value: test.itemName || "-" },
    { label: "Location", value: test.locationName ?? "-" },
    { label: "Tested By", value: test.testedByName ?? "-" },
    { label: "Approved By", value: test.approvedByName ?? "-" },
    { label: "Remarks", value: test.remarks ?? "-" },
  ];

  const summaryColumns: Column<(typeof summaryRows)[number]>[] = [
    { key: "label", label: "Field" },
    { key: "value", label: "Value" },
  ];

  const parameterColumns: Column<(typeof test.parameters)[number]>[] = [
    { key: "parameterName", label: "Parameter" },
    { key: "expectedValue", label: "Expected" },
    { key: "actualValue", label: "Actual" },
    { key: "unit", label: "Unit" },
    { key: "result", label: "Result" },
    { key: "remarks", label: "Remarks" },
  ];

  function runAction(path: string, action: QcTestAction) {
    withPending(action, async () => {
      setMessage("");
      const response = await fetch(path, { method: "POST" });
      const result = await response.json();
      if (!response.ok) {
        setMessage(result.error ?? "Unable to complete QC action");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
      <PageHeader
        recordKind="qc.record"
        title={test.testNo}
        subtitle="Review QC results, approve or reject the document, and trigger hold creation when stock must be blocked."
        breadcrumbs={[
          { label: "QC", href: "/qc" },
          { label: "Water Test", href: "/qc/water/ledger" },
          { label: test.testNo },
        ]}
        actions={
          <ActionButtons
            actions={[
              { label: "Back", variant: "secondary", onClick: () => router.push("/qc/water/ledger"), disabled: isBusy },
              { label: "Approve", variant: "primary", onClick: () => runAction(`/api/qc/tests/${test.id}/approve`, "approve"), loading: isLoading("approve"), disabled: isBusy },
              { label: "Reject", variant: "warning", onClick: () => runAction(`/api/qc/tests/${test.id}/reject`, "reject"), loading: isLoading("reject"), disabled: isBusy },
              ...(["FAILED", "REJECTED"].includes(test.result)
                ? [{ label: "Create Hold", variant: "secondary" as const, onClick: () => runAction(`/api/qc/tests/${test.id}/hold`, "hold"), loading: isLoading("hold"), disabled: isBusy }]
                : []),
            ]}
          />
        }
      />

      {message ? <p style={{ margin: 0, color: colors.danger[700] }}>{message}</p> : null}

      <div style={{ display: "grid", gap: `${spacing.card.gap}px` }}>
        <DataTable columns={summaryColumns} data={summaryRows} pageSize={20} />
        <DataTable columns={parameterColumns} data={test.parameters} pageSize={20} />
      </div>
    </div>
  );
}

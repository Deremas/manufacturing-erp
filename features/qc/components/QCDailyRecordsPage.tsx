"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { FilterCard, MetricCard, PageHeader } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { QCResultBadge } from "./QCResultBadge";
import { QCStatusBadge } from "./QCStatusBadge";

export function QCDailyRecordsPage({
  date,
  rows,
  shifts,
}: {
  date: string;
  rows: Array<Record<string, unknown>>;
  shifts: Array<{ value: string; label: string }>;
}) {
  const [groupBy, setGroupBy] = useState<"shift" | "product" | "type">("shift");
  const kpis = {
    total: rows.length,
    passed: rows.filter((row) => ["PASS", "WITHIN_SPEC", "ACCEPTED"].includes(String(row.result))).length,
    failed: rows.filter((row) => ["FAIL", "OUT_OF_SPEC", "REJECTED"].includes(String(row.result))).length,
    pending: rows.filter((row) => ["PENDING", "INCOMPLETE"].includes(String(row.result))).length,
    approval: rows.filter((row) => ["SUBMITTED", "CHECKED"].includes(String(row.status))).length,
  };
  const grouped = useMemo(() => {
    const map = new Map<string, typeof rows>();
    for (const row of rows) {
      const key = groupBy === "shift" ? String(row.shiftCode || "Unspecified") : groupBy === "product" ? String(row.itemName || "No product") : String(row.testTypeName);
      map.set(key, [...(map.get(key) ?? []), row]);
    }
    return [...map.entries()];
  }, [groupBy, rows]);

  return (
    <div style={{ display: "grid", gap: 18, maxWidth: 1600 }}>
      <PageHeader title="Daily QC Records" subtitle={date} breadcrumbs={[{ label: "QC", href: "/qc" }, { label: "Daily Records" }]} />
      <FilterCard
        fields={[
          { type: "date", key: "date", label: "Date" },
          { type: "select", key: "shiftCode", label: "Shift", options: shifts },
        ]}
        onFilter={(values) => {
          if (values.date) window.location.href = `/qc/daily-records/${values.date}`;
        }}
        onReset={() => undefined}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        <MetricCard label="Total Tests" value={kpis.total} />
        <MetricCard label="Passed" value={kpis.passed} />
        <MetricCard label="Failed" value={kpis.failed} />
        <MetricCard label="Pending" value={kpis.pending} />
        <MetricCard label="Awaiting Approval" value={kpis.approval} />
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        {(["shift", "product", "type"] as const).map((value) => (
          <button key={value} type="button" onClick={() => setGroupBy(value)} style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${colors.border}`, background: groupBy === value ? colors.primary[50] : "white", cursor: "pointer" }}>
            By {value}
          </button>
        ))}
      </div>
      {grouped.map(([group, items]) => (
        <section key={group} style={{ background: "white", border: `1px solid ${colors.border}`, borderRadius: 16, padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>{group}</h3>
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", minWidth: 900, borderCollapse: "collapse" }}>
              <thead>
                <tr>
                  {["Test Type", "Form", "Product", "Sample Point", "Batch", "Result", "Status", "Tester"].map((label) => (
                    <th key={label} style={{ textAlign: "left", padding: 10, background: "#f8fafc", fontSize: 12 }}>{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {items.map((row) => (
                  <tr key={String(row.id)}>
                    <td style={{ padding: 10 }}><Link href={`/qc/${row.slug}/${row.id}`}>{String(row.testTypeName)}</Link></td>
                    <td style={{ padding: 10 }}>{String(row.formCode)}</td>
                    <td style={{ padding: 10 }}>{String(row.itemName ?? "—")}</td>
                    <td style={{ padding: 10 }}>{String(row.samplePointName ?? "—")}</td>
                    <td style={{ padding: 10 }}>{String(row.batchNo ?? "—")}</td>
                    <td style={{ padding: 10 }}><QCResultBadge result={String(row.result)} /></td>
                    <td style={{ padding: 10 }}><QCStatusBadge status={String(row.status)} /></td>
                    <td style={{ padding: 10 }}>{String(row.testedByName ?? "—")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}

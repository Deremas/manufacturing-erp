"use client";

import { MetricCard } from "@/components/shared";

export interface ReportKpi {
  label: string;
  value: string | number;
}

export default function ReportKpiGrid({ items }: { items: ReportKpi[] }) {
  if (!items.length) {
    return null;
  }

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        gap: "16px",
      }}
    >
      {items.map((item) => (
        <MetricCard key={item.label} label={item.label} value={item.value} />
      ))}
    </div>
  );
}

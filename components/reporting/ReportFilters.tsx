"use client";

import type { ReactNode } from "react";

export default function ReportFilters({
  title = "Filters",
  children,
}: {
  title?: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "20px 24px",
        borderRadius: "16px",
        border: "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
          gap: "16px",
        }}
      >
        {children}
      </div>
    </section>
  );
}

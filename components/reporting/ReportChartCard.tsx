"use client";

import type { ReactNode } from "react";

export default function ReportChartCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
}) {
  return (
    <section
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        padding: "20px 24px",
        borderRadius: "16px",
        border: "1px solid #e5e7eb",
        background: "#ffffff",
      }}
    >
      <div>
        <div style={{ fontSize: 18, fontWeight: 700 }}>{title}</div>
        {subtitle ? (
          <div style={{ marginTop: 4, color: "#667085", lineHeight: "22px" }}>
            {subtitle}
          </div>
        ) : null}
      </div>
      {children}
    </section>
  );
}

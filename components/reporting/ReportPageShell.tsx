"use client";

import type { ReactNode } from "react";

import { spacing } from "@/components/ui/spacing";

export default function ReportPageShell({
  hero,
  filters,
  kpis,
  children,
}: {
  hero?: ReactNode;
  filters?: ReactNode;
  kpis?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
        padding: `${spacing.page.padding}px`,
        background: "#f8fafc",
      }}
    >
      {hero}
      {filters}
      {kpis}
      {children}
    </div>
  );
}

"use client";

import type { ReactNode } from "react";

export default function ReportPrintLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="print-content" style={{ display: "block", width: "100%" }}>
      {children}
    </div>
  );
}

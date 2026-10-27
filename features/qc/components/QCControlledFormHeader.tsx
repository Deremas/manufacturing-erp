"use client";

import { colors } from "@/components/ui/colors";

export function QCControlledFormHeader({
  code,
  title,
  frequency,
}: {
  code: string;
  title: string;
  frequency?: string | null;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(140px,auto) 1fr minmax(120px,auto)",
        gap: 12,
        alignItems: "center",
        padding: "8px 14px",
        background: `linear-gradient(135deg, ${colors.primary[700]} 0%, ${colors.primary[800]} 100%)`,
        color: "white",
        borderRadius: "10px 10px 0 0",
        fontSize: 12,
      }}
    >
      <strong style={{ letterSpacing: 0.3, fontWeight: 600 }}>{code}</strong>
      <div style={{ textAlign: "center", fontWeight: 600 }}>{title}</div>
      <div style={{ textAlign: "right", opacity: 0.92 }}>{frequency || ""}</div>
    </div>
  );
}

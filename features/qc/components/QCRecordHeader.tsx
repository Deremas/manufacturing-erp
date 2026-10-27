"use client";

import { colors } from "@/components/ui/colors";

export function QCRecordHeader({
  fields,
}: {
  fields: Array<{ label: string; value: React.ReactNode }>;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
        gap: 14,
        padding: "8px 0 16px",
      }}
    >
      {fields.map((field) => (
        <div key={field.label}>
          <small style={{ color: colors.text.muted }}>{field.label}</small>
          <div style={{ fontWeight: 600, marginTop: 4 }}>{field.value || "—"}</div>
        </div>
      ))}
    </div>
  );
}

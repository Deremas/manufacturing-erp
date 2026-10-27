"use client";

import { HistoryActionBadge, SectionHeading } from "@/components/shared";
import { colors } from "@/components/ui/colors";

export function QCHistoryPanel({
  rows,
}: {
  rows: Array<{ id: string; action: string; performedByName?: string | null; remarks?: string | null; createdAt: string }>;
}) {
  if (!rows.length) return null;
  return (
    <section style={{ background: "white", border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20 }}>
      <SectionHeading title="History" />
      <ol style={{ margin: 0, paddingLeft: 18, display: "grid", gap: 10 }}>
        {rows.map((row) => (
          <li key={row.id} style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
              <HistoryActionBadge action={row.action} />
              <span style={{ color: colors.text.secondary }}>
                {row.performedByName || "System"} · {new Date(row.createdAt).toLocaleString()}
              </span>
            </div>
            {row.remarks ? <div style={{ color: colors.text.muted }}>{row.remarks}</div> : null}
          </li>
        ))}
      </ol>
    </section>
  );
}

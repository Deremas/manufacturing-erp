import Link from "next/link";

import { loadShift } from "@/app/production/shift-sessions/[id]/_lib/load-session";
import { colors } from "@/components/ui/colors";
import { formatNumberDisplay } from "@/lib/utils/format-number";

export const dynamic = "force-dynamic";

export default async function FinishedGoodsHandoverPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await loadShift(id, "/fg-handover");
  const base = `/production/shift-sessions/${session.publicId}`;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>Finished Goods Handover</h1>
          <p style={{ margin: "6px 0 0", maxWidth: 720, color: colors.text.secondary, fontSize: 14 }}>
            {session.sessionNo}. Accepted output can be prepared for handover. Finished-goods inventory increases only when an authorized FG receipt is posted.
          </p>
        </div>
        <Link href={base} style={{ height: 42, padding: "0 14px", display: "inline-flex", alignItems: "center", borderRadius: 8, border: `1px solid ${colors.border}`, textDecoration: "none", color: colors.text.primary, fontWeight: 600 }}>Back to Shift</Link>
      </header>
      <section style={{ background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20, overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 720 }}>
          <thead>
            <tr>{["Batch", "Product", "Accepted", "Handed Over", "Available to Handover"].map((header) => <th key={header} style={{ textAlign: "left", fontSize: 12, fontWeight: 600, color: colors.text.secondary, padding: "10px 12px" }}>{header}</th>)}</tr>
          </thead>
          <tbody>
            {session.batches.length === 0 ? (
              <tr><td colSpan={5} style={{ padding: 16, color: colors.text.secondary }}>No accepted output is available to hand over.</td></tr>
            ) : session.batches.map((batch) => (
              <tr key={batch.batchNo}>
                <td style={cell}>{batch.batchNo}</td>
                <td style={cell}>{batch.finishedGoodCode} — {batch.finishedGoodName}</td>
                <td style={cell}>{formatNumberDisplay(batch.acceptedQty, { maximumFractionDigits: 3 })}</td>
                <td style={cell}>0</td>
                <td style={cell}>{formatNumberDisplay(batch.acceptedQty, { maximumFractionDigits: 3 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p style={{ margin: "16px 0 0", fontSize: 14, color: colors.text.secondary }}>
          A handover document with source factory, destination FG store, and separate sending and receiving signatures is not stored yet. This page does not post stock.
        </p>
      </section>
    </div>
  );
}

const cell: React.CSSProperties = { padding: "12px", borderTop: "1px solid #e5e7eb", fontSize: 14 };

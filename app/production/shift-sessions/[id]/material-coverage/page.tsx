import Link from "next/link";

import { loadShift } from "@/app/production/shift-sessions/[id]/_lib/load-session";
import { colors } from "@/components/ui/colors";
import { formatNumberDisplay } from "@/lib/utils/format-number";
import { getShiftMaterialCoverage } from "@/services/production/shift-coverage.service";

export const dynamic = "force-dynamic";

export default async function MaterialCoveragePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await loadShift(id, "/material-coverage");
  const rows = await getShiftMaterialCoverage(session.id, session.locationId);
  const base = `/production/shift-sessions/${session.publicId}`;
  const qty = (value: number) => formatNumberDisplay(value, { maximumFractionDigits: 3 });

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>Product Plan & Material Coverage</h1>
          <p style={{ margin: "6px 0 0", color: colors.text.secondary, fontSize: 14 }}>
            {session.sessionNo} · {session.locationName} · {session.shiftCode}. Requirements are scaled from the active BOM and recorded output. They do not consume stock.
          </p>
        </div>
        <Link href={base} style={back}>Back to Shift</Link>
      </header>
      <section style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
          <h2 style={{ margin: 0, fontSize: 17 }}>BOM Material Requirements</h2>
          {session.status === "ACTIVE" ? <Link href={`${base}/materials/receive`} style={action}>Receive Materials</Link> : null}
        </div>
        <div style={{ overflowX: "auto", marginTop: 12 }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr>
                {["Product", "BOM", "Material", "BOM Qty", "Required", "WIP On Hand", "Available", "Reserved", "Shortage", "Status"].map((header) => (
                  <th key={header} style={th}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={10} style={td}>No BOM components are linked to this shift’s recorded output. Record production against a finished good that has an active BOM.</td></tr>
              ) : rows.map((row) => (
                <tr key={`${row.productCode}-${row.materialCode}`}>
                  <td style={td}>{row.productCode} — {row.productName}</td>
                  <td style={td}>{row.bomNo}</td>
                  <td style={td}>{row.materialCode} — {row.materialName}</td>
                  <td style={td}>{qty(row.bomQuantity)} {row.uom || ""}</td>
                  <td style={td}>{qty(row.totalRequired)}</td>
                  <td style={td}>{qty(row.wipOnHand)}</td>
                  <td style={td}>{qty(row.wipAvailable)}</td>
                  <td style={td}>{qty(row.reserved)}</td>
                  <td style={td}>{qty(row.shortage)}</td>
                  <td style={td}>{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

const card: React.CSSProperties = { background: "white", border: "1px solid #e5e7eb", borderRadius: 12, padding: 20 };
const th: React.CSSProperties = { textAlign: "left", fontSize: 12, fontWeight: 600, color: "#6b7280", padding: "10px 12px" };
const td: React.CSSProperties = { fontSize: 14, padding: "12px", borderTop: "1px solid #e5e7eb" };
const back: React.CSSProperties = { height: 42, padding: "0 14px", display: "inline-flex", alignItems: "center", borderRadius: 8, border: "1px solid #e5e7eb", textDecoration: "none", color: "#111827", fontWeight: 600 };
const action: React.CSSProperties = { height: 42, padding: "0 14px", display: "inline-flex", alignItems: "center", borderRadius: 8, background: "#0f766e", color: "white", textDecoration: "none", fontWeight: 600 };

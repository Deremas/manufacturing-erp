"use client";

import Link from "next/link";

import { colors } from "@/components/ui/colors";
import { formatNumberDisplay } from "@/lib/utils/format-number";
import { publicViewUrl } from "@/lib/routing/urls";

export function MissingRulePage({ title, subtitle, rule }: { title: string; subtitle: string; rule: string }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600, color: colors.text.primary }}>{title}</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: colors.text.secondary }}>{subtitle}</p>
      </header>
      <section style={cardStyle}>
        <h2 style={{ margin: "0 0 8px", fontSize: 16, fontWeight: 600 }}>Business rule still required</h2>
        <p style={{ margin: 0, fontSize: 14, lineHeight: 1.55, color: colors.text.primary }}>{rule}</p>
      </section>
    </div>
  );
}

export function WipBalancePage({ rows }: { rows: Array<{ itemCode: string; itemName: string; uom: string | null; locationName: string; quantity: number; reservedQuantity: number; availableQuantity: number }> }) {
  const onHand = rows.reduce((sum, row) => sum + Number(row.quantity || 0), 0);
  const reserved = rows.reduce((sum, row) => sum + Number(row.reservedQuantity || 0), 0);
  const allocatable = rows.reduce((sum, row) => sum + Number(row.availableQuantity || 0), 0);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header style={{ display: "flex", justifyContent: "space-between", gap: 16, flexWrap: "wrap" }}>
        <div>
          <h1 style={titleStyle}>Production Stock Balance (WIP)</h1>
          <p style={subtitleStyle}>On-hand, reserved, and allocatable stock at production locations. This is the inventory ledger, not a second balance.</p>
        </div>
        <Link href="/production/wip/movements" style={linkStyle}>View movements</Link>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 16 }}>
        <Metric label="Materials" value={String(rows.length)} />
        <Metric label="On Hand" value={formatNumberDisplay(onHand, { maximumFractionDigits: 3 })} />
        <Metric label="Reserved" value={formatNumberDisplay(reserved, { maximumFractionDigits: 3 })} />
        <Metric label="Allocatable" value={formatNumberDisplay(allocatable, { maximumFractionDigits: 3 })} />
      </div>
      <section style={{ ...cardStyle, overflowX: "auto", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
          <thead>
            <tr>
              {["Factory", "Material", "UoM", "On Hand", "Reserved", "Allocatable"].map((label, index) => (
                <th key={label} style={{ textAlign: index > 2 ? "right" : "left", padding: "12px 16px", fontSize: 12, fontWeight: 600, color: colors.text.secondary }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 24, color: colors.text.secondary }}>No WIP balances are posted at production locations.</td></tr>
            ) : rows.map((row) => (
              <tr key={`${row.locationName}-${row.itemCode}`}>
                <td style={cellStyle}>{row.locationName}</td>
                <td style={cellStyle}>{row.itemCode} — {row.itemName}</td>
                <td style={cellStyle}>{row.uom || "—"}</td>
                <td style={{ ...cellStyle, textAlign: "right" }}>{formatNumberDisplay(row.quantity, { maximumFractionDigits: 3 })}</td>
                <td style={{ ...cellStyle, textAlign: "right" }}>{formatNumberDisplay(row.reservedQuantity, { maximumFractionDigits: 3 })}</td>
                <td style={{ ...cellStyle, textAlign: "right" }}>{formatNumberDisplay(Number(row.availableQuantity), { maximumFractionDigits: 3 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

export function RejectedMaterialsPage({ rows }: { rows: Array<{ publicId: number; batchNo: string; sessionNo: string; shiftCode: string; itemCode: string; itemName: string; rejectedQty: number; status: string; locationName: string }> }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <h1 style={titleStyle}>Rejected / Reusable Materials</h1>
        <p style={subtitleStyle}>Rejected output stays unavailable until QC posts a disposition and stock is reclassified. Reuse is not assumed from this list.</p>
      </header>
      <section style={{ ...cardStyle, overflowX: "auto", padding: 0 }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 860 }}>
          <thead>
            <tr>
              {["Batch", "Shift", "Factory", "Product", "Rejected Qty", "Status"].map((label) => (
                <th key={label} style={{ textAlign: "left", padding: "12px 16px", fontSize: 12, fontWeight: 600, color: colors.text.secondary }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr><td colSpan={6} style={{ padding: 24, color: colors.text.secondary }}>No rejected production quantities are recorded.</td></tr>
            ) : rows.map((row) => (
              <tr key={row.batchNo}>
                <td style={cellStyle}><Link href={publicViewUrl("production.batch", row.publicId)} style={{ color: colors.primary[700], fontWeight: 600, textDecoration: "none" }}>{row.batchNo}</Link></td>
                <td style={cellStyle}>{row.sessionNo} · {row.shiftCode}</td>
                <td style={cellStyle}>{row.locationName}</td>
                <td style={cellStyle}>{row.itemCode} — {row.itemName}</td>
                <td style={cellStyle}>{formatNumberDisplay(row.rejectedQty, { maximumFractionDigits: 3 })}</td>
                <td style={cellStyle}>{row.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ ...cardStyle, minHeight: 96 }}>
      <div style={{ fontSize: 24, fontWeight: 700 }}>{value}</div>
      <div style={{ fontSize: 14, color: colors.text.secondary, marginTop: 4 }}>{label}</div>
    </div>
  );
}

const titleStyle: React.CSSProperties = { margin: 0, fontSize: 26, fontWeight: 600, color: colors.text.primary };
const subtitleStyle: React.CSSProperties = { margin: "6px 0 0", fontSize: 14, color: colors.text.secondary, maxWidth: 720 };
const cardStyle: React.CSSProperties = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20 };
const cellStyle: React.CSSProperties = { padding: "12px 16px", borderTop: `1px solid ${colors.border}`, fontSize: 14 };
const linkStyle: React.CSSProperties = { height: 42, padding: "0 14px", display: "inline-flex", alignItems: "center", borderRadius: 8, background: colors.primary[600], color: "white", textDecoration: "none", fontWeight: 600 };

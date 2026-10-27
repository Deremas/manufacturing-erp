"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { colors } from "@/components/ui/colors";

type Option = { value: string; label: string };
type BomChoice = { value: string; label: string; finishedGoodId: string; outputQty: number };
type ConsumptionLine = { itemId: string; label: string; uom: string; required: number; usedQty: number };

export default function DailyProductionReportPage({
  sessionNo,
  sessionPath,
  productionDate,
  shiftCode,
  factoryLocationId,
  factoryLocationName,
  outputApiPath,
  finishedGoods,
  boms,
}: {
  sessionNo: string;
  sessionPath: string;
  productionDate: string;
  shiftCode: string;
  factoryLocationId: string;
  factoryLocationName: string;
  outputApiPath: string;
  finishedGoods: Option[];
  boms: BomChoice[];
}) {
  const router = useRouter();
  const shiftLabel = shiftTitle(shiftCode);
  const [finishedGoodId, setFinishedGoodId] = useState("");
  const [bomId, setBomId] = useState("");
  const [producedQty, setProducedQty] = useState(0);
  const [acceptedQty, setAcceptedQty] = useState(0);
  const [rejectedQty, setRejectedQty] = useState(0);
  const [wastageQty, setWastageQty] = useState(0);
  const [remarks, setRemarks] = useState("");
  const [wastageRemarks, setWastageRemarks] = useState("");
  const [lines, setLines] = useState<ConsumptionLine[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const product = finishedGoods.find((row) => row.value === finishedGoodId);
  const productBoms = boms.filter((row) => row.finishedGoodId === finishedGoodId);
  const selectedBom = productBoms.find((row) => row.value === bomId) ?? productBoms[0];
  const selectedBomId = selectedBom?.value ?? "";
  const productName = product?.label ?? "Product";

  useEffect(() => {
    if (!selectedBomId || producedQty <= 0) {
      setLines([]);
      return;
    }
    let cancelled = false;
    void fetch(`/api/production/bom/${selectedBomId}`)
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Unable to load the bill of materials");
        return body as { outputQty: number; items: Array<{ componentItemId: string; componentItemCode: string; componentItemName: string; uomName: string | null; quantity: number; wastagePercent: number }> };
      })
      .then((bom) => {
        if (cancelled) return;
        const output = Number(bom.outputQty) > 0 ? Number(bom.outputQty) : 1;
        setLines(bom.items.map((item) => {
          const required = (Number(item.quantity) / output) * (1 + Number(item.wastagePercent || 0) / 100) * producedQty;
          return {
            itemId: item.componentItemId,
            label: `${item.componentItemCode} — ${item.componentItemName}`,
            uom: item.uomName || "",
            required,
            usedQty: required,
          };
        }));
      })
      .catch(() => {
        if (!cancelled) setLines([]);
      });
    return () => {
      cancelled = true;
    };
  }, [selectedBomId, producedQty]);

  async function saveReport() {
    setError("");
    if (!finishedGoodId) {
      setError("Select the finished product.");
      return;
    }
    if (producedQty <= 0) {
      setError("Enter the new finished output.");
      return;
    }
    const classified = acceptedQty + rejectedQty + wastageQty;
    if (Math.abs(classified - producedQty) > 0.0001) {
      setError("Accepted, rejected, and production damage must add up to the new finished output.");
      return;
    }
    const consumption = lines
      .map((row) => `${row.label}: used ${formatQty(row.usedQty)} of ${formatQty(row.required)} required`)
      .join("\n");
    setBusy(true);
    try {
      const response = await fetch(outputApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save",
          finishedGoodId,
          bomId: selectedBom?.value || "",
          locationId: factoryLocationId,
          producedQty,
          acceptedQty,
          rejectedQty,
          wastageQty,
          remarks: [remarks.trim(), wastageRemarks.trim() ? `Wastage: ${wastageRemarks.trim()}` : "", consumption].filter(Boolean).join("\n"),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || "Unable to save the production report");
      router.push(sessionPath);
      router.refresh();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to save the production report");
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1180 }}>
      <header style={titleRow}>
        <h1 style={title}>Daily Production Report</h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`${sessionPath}/materials/receive`} style={backButton}>Receive / Attach Materials</Link>
          <Link href={sessionPath} style={backButton}>Back to Session</Link>
        </div>
      </header>

      <div style={metaRow}>
        <Meta label="Date" value={formatDate(productionDate)} />
        <Meta label="Shift" value={shiftLabel} />
        <Meta label="Session" value={sessionLabel(sessionNo)} />
        <Meta label="Location" value={factoryLocationName} />
      </div>

      <section style={card}>
        <h2 style={sectionTitle}>Production — {shiftLabel}{product ? ` — ${productName}` : ""}</h2>
        <div style={formGrid}>
          <Field label="Finished Product" required>
            <select style={input} value={finishedGoodId} onChange={(event) => { setFinishedGoodId(event.target.value); setBomId(""); }}>
              <option value="">Select Product...</option>
              {finishedGoods.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </Field>
          <Field label="BOM">
            <select style={input} value={selectedBom?.value ?? ""} onChange={(event) => setBomId(event.target.value)}>
              <option value="">No BOM</option>
              {productBoms.map((bom) => <option key={bom.value} value={bom.value}>{bom.label}</option>)}
            </select>
          </Field>
          <Field label="New Finished Output" required>
            <input style={input} type="number" min={0} value={producedQty || ""} placeholder="0" onChange={(event) => setProducedQty(Number(event.target.value))} />
          </Field>
          <Field label="Rejected Qty">
            <input style={input} type="number" min={0} value={rejectedQty || ""} placeholder="0" onChange={(event) => setRejectedQty(Number(event.target.value))} />
          </Field>
          <Field label="Production Damage">
            <input style={input} type="number" min={0} value={wastageQty || ""} placeholder="0" onChange={(event) => setWastageQty(Number(event.target.value))} />
          </Field>
          <Field label="Total Accepted Finished Output" required>
            <input style={input} type="number" min={0} value={acceptedQty || ""} placeholder="0" onChange={(event) => setAcceptedQty(Number(event.target.value))} />
          </Field>
        </div>
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>BOM material consumption{product ? ` — ${productName}` : ""}</h2>
        <p style={note}>Required follows the new finished output. Enter the quantity this shift used. Saving the report does not post finished-goods stock and does not reduce WIP by itself.</p>
        {lines.length === 0 ? <p style={note}>Select a product with a BOM and enter the new finished output.</p> : (
          <table style={{ width: "100%", borderCollapse: "collapse", maxWidth: 860 }}>
            <thead>
              <tr>{["Material", "UOM", "Required", "Used"].map((header) => <th key={header} style={th}>{header}</th>)}</tr>
            </thead>
            <tbody>
              {lines.map((row) => (
                <tr key={row.itemId}>
                  <td style={td}>{row.label}</td>
                  <td style={{ ...td, width: 90 }}>{row.uom || "—"}</td>
                  <td style={{ ...td, width: 120 }}>{formatQty(row.required)}</td>
                  <td style={{ ...td, width: 140 }}>
                    <input style={{ ...input, width: 120 }} type="number" min={0} value={row.usedQty || ""} onChange={(event) => setLines((current) => current.map((line) => line.itemId === row.itemId ? { ...line, usedQty: Number(event.target.value) } : line))} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div style={{ ...formGrid, marginTop: 16 }}>
          <Field label="Production Remarks" wide>
            <textarea style={textarea} value={remarks} onChange={(event) => setRemarks(event.target.value)} />
          </Field>
          <Field label="Wastage Remarks" wide>
            <textarea style={textarea} value={wastageRemarks} onChange={(event) => setWastageRemarks(event.target.value)} />
          </Field>
        </div>
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
          <button type="button" onClick={saveReport} disabled={busy} style={primary}>{busy ? "Saving..." : `Save ${shiftLabel} Report`}</button>
        </div>
      </section>
    </div>
  );
}

function Field({ label, required, wide, children }: { label: string; required?: boolean; wide?: boolean; children: React.ReactNode }) {
  return (
    <label style={{ ...field, width: wide ? 496 : 240 }}>
      <span>{label}{required ? <span style={{ color: "#dc2626" }}> *</span> : null}</span>
      {children}
    </label>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div style={metaCard}>
      <div style={{ fontSize: 12, color: colors.text.secondary }}>{label}</div>
      <div style={{ marginTop: 4, fontWeight: 700 }}>{value}</div>
    </div>
  );
}

function shiftTitle(code: string) {
  const letter = String(code).toUpperCase().match(/([ABC])/);
  return letter ? `Shift ${letter[1]}` : code;
}

function sessionLabel(sessionNo: string) {
  const match = sessionNo.match(/(\d{4})-(\d+)/);
  return match ? `Session/${match[1]}/${match[2].padStart(4, "0")}` : sessionNo;
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function formatQty(value: number) {
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 3 }).format(value || 0);
}

const titleRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap" };
const title: React.CSSProperties = { margin: 0, fontSize: 26, fontWeight: 650 };
const sectionTitle: React.CSSProperties = { margin: "0 0 12px", fontSize: 16, fontWeight: 650 };
const card: React.CSSProperties = { background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 };
const note: React.CSSProperties = { margin: "0 0 12px", color: colors.text.secondary, fontSize: 13, lineHeight: 1.45, maxWidth: 860 };
const metaRow: React.CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap" };
const metaCard: React.CSSProperties = { width: 180, background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px" };
const formGrid: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 16 };
const field: React.CSSProperties = { width: 240, display: "flex", flexDirection: "column", gap: 6, fontSize: 13, fontWeight: 650 };
const input: React.CSSProperties = { width: "100%", height: 38, border: "1px solid #cbd5e1", borderRadius: 8, padding: "0 10px", fontSize: 14, fontWeight: 500, background: "#fff", boxSizing: "border-box" };
const textarea: React.CSSProperties = { width: "100%", height: 76, border: "1px solid #cbd5e1", borderRadius: 8, padding: 10, fontSize: 14, fontWeight: 500, background: "#fff", boxSizing: "border-box", resize: "vertical" };
const th: React.CSSProperties = { textAlign: "left", fontSize: 12, color: colors.text.secondary, padding: "8px 10px", borderBottom: `1px solid ${colors.border}` };
const td: React.CSSProperties = { fontSize: 14, padding: "10px", borderTop: `1px solid ${colors.border}`, verticalAlign: "middle" };
const primary: React.CSSProperties = { height: 38, padding: "0 16px", borderRadius: 8, border: "1px solid transparent", background: colors.primary[600], color: "#fff", fontWeight: 700, cursor: "pointer" };
const backButton: React.CSSProperties = { height: 38, padding: "0 14px", borderRadius: 8, border: "1px solid #94a3b8", background: "#fff", color: colors.text.primary, fontWeight: 700, display: "inline-flex", alignItems: "center", textDecoration: "none" };

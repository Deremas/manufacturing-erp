"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, BadgeCheck, Clock3, Factory, Package, Warehouse } from "lucide-react";

import { StatusBadge } from "@/components/shared";
import type { BadgeVariant } from "@/components/ui/badges";
import { colors } from "@/components/ui/colors";
import { formatNumberDisplay } from "@/lib/utils/format-number";

type Attendance = { userName: string; role: string | null; remarks: string | null };
type Issue = { issueNo: string; status: string; itemCount: number; issuedQty: number };
type ReturnRow = { returnNo: string; status: string; itemCount: number };
type Batch = {
  publicId: number;
  batchNo: string;
  status: string;
  producedQty: number;
  acceptedQty: number;
  rejectedQty: number;
  wastageQty: number;
  finishedGoodCode: string;
  finishedGoodName: string;
  machineName: string | null;
};
type Downtime = { reason: string | null; durationMinutes: number; machine: string | null; status: string; maintenanceTicketNo: string | null };
type QcTest = { testNo: string; result: string; status: string };
type Coverage = {
  productCode: string;
  productName: string;
  materialCode: string;
  materialName: string;
  uom: string | null;
  totalRequired: number;
  wipAvailable: number;
  shortage: number;
  status: string;
};

export type ShiftWorkspaceData = {
  id: string;
  publicId: number;
  sessionNo: string;
  productionDate: string;
  shiftCode: string;
  shiftName: string;
  locationName: string;
  status: string;
  startedByName: string | null;
  startedAt: string | null;
  endedAt: string | null;
  attendance: Attendance[];
  issues: Issue[];
  returns: ReturnRow[];
  batches: Batch[];
  downtimes: Downtime[];
  qcTests: QcTest[];
  coverage: Coverage[];
};

function qty(value: number) {
  return formatNumberDisplay(value, { maximumFractionDigits: 3 });
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(date);
}

function when(value: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString("en-KE");
}

function sessionLabel(sessionNo: string) {
  const match = sessionNo.match(/(\d{4})\D*(\d+)/);
  if (!match) return sessionNo;
  return `Session/${match[1]}/${match[2].padStart(4, "0")}`;
}

function shiftLetter(code: string) {
  const match = String(code).toUpperCase().match(/([ABC])(?:[^A-Z]|$)/);
  return match?.[1] ?? String(code).replace(/[^A-Z0-9]/gi, "").slice(0, 1).toUpperCase();
}

function shiftColor(letter: string) {
  if (letter === "A") return "#0f9f6e";
  if (letter === "B") return "#2563eb";
  if (letter === "C") return "#d97706";
  return "#0f766e";
}

function shiftTitle(code: string, name: string) {
  const cleaned = name.trim();
  if (cleaned && cleaned.toUpperCase() !== code.toUpperCase()) return cleaned;
  const letter = shiftLetter(code);
  return letter ? `Shift ${letter}` : code;
}

function statusVariant(status: string): BadgeVariant {
  if (status === "ACTIVE") return "active";
  if (status === "COMPLETED") return "pending";
  if (status === "POSTED") return "posted";
  if (status === "CANCELLED") return "voided";
  return "inactive";
}

export default function ShiftWorkspacePage({ session }: { session: ShiftWorkspaceData }) {
  const router = useRouter();
  const base = `/production/shift-sessions/${session.publicId}`;
  const active = session.status === "ACTIVE";
  const pendingQc = session.qcTests.filter((row) => String(row.result).toUpperCase() === "PENDING" || String(row.status).toUpperCase() === "PENDING").length;
  const materialLines = session.issues.reduce((sum, row) => sum + row.itemCount, 0);
  const materialQty = session.issues.reduce((sum, row) => sum + row.issuedQty, 0);
  const readyMaterials = session.coverage.filter((row) => row.status === "Ready").length;
  const products = session.batches.length > 0 ? session.batches : [null];
  const [endOpen, setEndOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [endError, setEndError] = useState("");
  const openIssues = session.issues.filter((row) => !["POSTED", "CANCELLED"].includes(row.status.toUpperCase())).length;
  const openReturns = session.returns.filter((row) => !["POSTED", "CANCELLED"].includes(row.status.toUpperCase())).length;
  const endBlocked = openIssues + openReturns > 0;

  async function confirmEndShift() {
    setEnding(true);
    setEndError("");
    try {
      const response = await fetch(`/api/shifts/sessions/${session.id}/end`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || "Unable to end the shift");
      setEndOpen(false);
      router.refresh();
    } catch (cause) {
      setEndError(cause instanceof Error ? cause.message : "Unable to end the shift");
    } finally {
      setEnding(false);
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, paddingBottom: 24 }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 16, alignItems: "flex-start", flexWrap: "wrap" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h1 style={{ margin: 0, display: "flex", alignItems: "center", gap: 8, fontSize: 26, fontWeight: 600 }}>
              <Clock3 size={24} color={colors.primary[600]} />
              Shift — {formatDate(session.productionDate)}
            </h1>
            <StatusBadge status={statusVariant(session.status)} label={session.status} size="sm" />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8 }}>
            <span style={sessionChip}>{sessionLabel(session.sessionNo)}</span>
            <span style={{ ...shiftBadge, background: shiftColor(shiftLetter(session.shiftCode)) }}>{shiftLetter(session.shiftCode)}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: colors.text.primary }}>{shiftTitle(session.shiftCode, session.shiftName)}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button type="button" onClick={() => router.push("/production/shift-sessions")} style={secondaryButton}><ArrowLeft size={16} strokeWidth={2.4} />Back</button>
          {active ? <button type="button" onClick={() => { setEndError(""); setEndOpen(true); }} style={primaryButton}>End Shift</button> : null}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12 }}>
        {[
          ["Date", formatDate(session.productionDate)],
          ["Location", session.locationName],
          ["Started At", when(session.startedAt)],
          ["Ended At", when(session.endedAt)],
          ["Started By", session.startedByName ?? "—"],
        ].map(([label, value]) => (
          <div key={label} style={card}>
            <div style={{ fontSize: 12, color: colors.text.secondary }}>{label}</div>
            <div style={{ marginTop: 6, fontSize: 15, fontWeight: 600 }}>{value}</div>
          </div>
        ))}
      </div>

      <section style={card}>
        <SectionTitle
          title={<span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Factory size={18} color="#0f172a" />Shift Workflow — {session.batches.length} product{session.batches.length === 1 ? "" : "s"}</span>}
          action={
            <>
              <Link href={`${base}/material-coverage`} style={textLink}>Product Plan & Coverage</Link>
              <Link href="/production/wip" style={textLink}>Open Full WIP Balance</Link>
              {active ? <Link href={`${base}/materials/returns`} style={textLink}>Return Materials</Link> : null}
              {active ? <Link href={`${base}/downtime/create`} style={textLink}>Record Downtime</Link> : null}
            </>
          }
        />
        {products.map((batch) => {
          const productCoverage = batch ? session.coverage.filter((row) => row.productCode === batch.finishedGoodCode) : [];
          const productReady = productCoverage.filter((row) => row.status === "Ready").length;
          const accepted = batch?.acceptedQty ?? 0;
          return (
            <article key={batch?.batchNo ?? "empty"} style={{ marginTop: 8 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 12, marginBottom: 10, flexWrap: "wrap" }}>
                <div>
                  <strong>{batch ? `${batch.finishedGoodCode} — ${batch.finishedGoodName}` : "No product recorded"}</strong>
                  <div style={{ marginTop: 4, color: colors.text.secondary, fontSize: 13 }}>
                    {batch ? "Output is recorded on this shift. Finished-goods stock is not posted from the shift." : "Record production before materials, quality, and handover can be tracked for a product."}
                  </div>
                </div>
                {batch ? <span style={{ color: colors.text.secondary, fontSize: 13 }}>{batch.batchNo}</span> : null}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 10 }}>
                <MetricBlock
                  href={active ? `${base}/materials/receive` : `${base}/material-coverage`}
                  icon={<Package size={16} color="#d97706" />}
                  title="Materials"
                  status={materialsStatus(productCoverage.length, productReady, session.issues.length)}
                  rows={[
                    ["Planned output", "Not set"],
                    ["Materials ready", productCoverage.length ? `${productReady} of ${productCoverage.length} materials ready` : session.coverage.length ? `${readyMaterials} of ${session.coverage.length} materials ready` : "No BOM coverage yet"],
                  ]}
                />
                <MetricBlock
                  href={active ? `${base}/daily-report` : base}
                  icon={<Factory size={16} color="#0f766e" />}
                  title="Production"
                  status={batch && batch.producedQty > 0 ? { label: "RECORDED", tone: "done" } : { label: "OPEN", tone: "open" }}
                  rows={[
                    ["Planned", "Not set"],
                    ["Recorded", qty(batch?.producedQty ?? 0)],
                    ["Accepted", qty(accepted)],
                    ["Rejected", qty(batch?.rejectedQty ?? 0)],
                  ]}
                />
                <MetricBlock
                  href={`${base}/daily-report`}
                  icon={<BadgeCheck size={16} color="#16a34a" />}
                  title="Quality"
                  status={pendingQc > 0 ? { label: "OPEN", tone: "open" } : session.qcTests.length > 0 ? { label: "PASSED", tone: "done" } : { label: "OPEN", tone: "open" }}
                  rows={[[pendingQc ? "Pending QC" : "QC records", String(pendingQc || session.qcTests.length)]]}
                />
                <MetricBlock
                  href={`${base}/fg-handover`}
                  icon={<Warehouse size={16} color="#2563eb" />}
                  title="FG Handover"
                  status={{ label: "OPEN RECEIPT", tone: "open" }}
                  rows={[
                    ["Ready to send", qty(accepted)],
                    ["Sent", "0"],
                    ["FG receipt", "—"],
                    ["Stock status", "Not posted"],
                  ]}
                />
              </div>
            </article>
          );
        })}
        <div style={{ marginTop: 16 }}>
          <Link href={`${base}/fg-handover`} style={primaryButton}>Prepare FG Handover</Link>
          <p style={{ margin: "8px 0 0", color: colors.text.secondary, fontSize: 13 }}>
            Finished-goods stock increases only when an authorized FG receipt is posted. Preparing a handover does not post that receipt.
          </p>
        </div>
      </section>

      <section style={card}>
        <SectionTitle title={`Production Lines (${session.batches.length} product${session.batches.length === 1 ? "" : "s"})`} action={active ? <Link href={`${base}/daily-report`} style={textLink}>Record Production</Link> : null} />
        <p style={{ margin: "0 0 12px", color: colors.text.secondary, fontSize: 14 }}>
          This factory shift can run multiple products. Each line tracks its own output and wastage. Material receipts stay on the shift until a product allocation exists.
        </p>
        <SimpleTable
          headers={["Product", "Material Lines", "Material Qty Received", "Output", "Wastage"]}
          rows={session.batches.map((batch) => [
            `${batch.finishedGoodCode} — ${batch.finishedGoodName}`,
            session.batches.length === 1 ? String(materialLines) : "—",
            session.batches.length === 1 ? qty(materialQty) : "—",
            qty(batch.producedQty),
            qty(batch.wastageQty),
          ])}
          empty="No production lines."
        />
      </section>

      <section style={card}>
        <SectionTitle title={`Assigned Staff (${session.attendance.length})`} />
        <SimpleTable headers={["Name", "Role", "Notes"]} rows={session.attendance.map((row) => [row.userName, row.role || "—", row.remarks || "—"])} empty="No staff assigned." />
      </section>

      <section style={card}>
        <SectionTitle title="Shift Material Coverage & BOM Progress" action={<Link href={`${base}/material-coverage`} style={textLink}>Manage Materials</Link>} />
        <SimpleTable
          headers={["Product", "Material", "BOM Required", "WIP Available", "Shortage", "Status"]}
          rows={session.coverage.map((row) => [
            `${row.productCode} — ${row.productName}`,
            `${row.materialCode} ${row.materialName}${row.uom ? ` (${row.uom})` : ""}`,
            qty(row.totalRequired),
            qty(row.wipAvailable),
            qty(row.shortage),
            row.status,
          ])}
          empty="No BOM coverage yet. Coverage appears after output is recorded against an active bill of materials."
        />
      </section>

      <section style={card}>
        <SectionTitle title="Materials Received" action={active ? <Link href={`${base}/materials/receive`} style={primaryButton}>Receive Materials</Link> : null} />
        <SimpleTable headers={["Issue", "Lines", "Qty Received", "Status"]} rows={session.issues.map((row) => [row.issueNo, String(row.itemCount), qty(row.issuedQty), row.status])} empty="No materials received yet." />
      </section>

      <section style={card}>
        <SectionTitle title="Material Returns" action={active ? <Link href={`${base}/materials/returns`} style={primaryButton}>Create Return</Link> : null} />
        <SimpleTable headers={["Return", "Lines", "Status"]} rows={session.returns.map((row) => [row.returnNo, String(row.itemCount), row.status])} empty="No material returns." />
      </section>

      <section style={card}>
        <SectionTitle title="Downtime Summary" action={active ? <Link href={`${base}/downtime/create`} style={primaryButton}>Record Downtime</Link> : null} />
        <SimpleTable headers={["Machine", "Reason", "Minutes", "Maintenance", "Status"]} rows={session.downtimes.map((row) => [row.machine || "—", row.reason || "—", String(row.durationMinutes), row.maintenanceTicketNo || "—", row.status])} empty="No downtime recorded." />
      </section>

      <section style={card}>
        <SectionTitle title="Shift Reconciliation" action={<Link href={`${base}/reconciliation`} style={textLink}>Review Reconciliation</Link>} />
        <p style={{ margin: 0, color: colors.text.secondary, fontSize: 14 }}>Closure checks unposted material documents before the shift can end. Finished-goods stock is not created by ending the shift.</p>
      </section>

      {endOpen ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="end-shift-title"
          onClick={() => { if (!ending) setEndOpen(false); }}
          style={{ position: "fixed", inset: 0, background: "rgba(15, 23, 42, 0.45)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 80, padding: 16 }}
        >
          <div onClick={(event) => event.stopPropagation()} style={{ width: "min(560px, 100%)", background: "#ffffff", borderRadius: 12, boxShadow: "0 16px 40px rgba(15, 23, 42, 0.2)", overflow: "hidden" }}>
            <div style={{ padding: 24 }}>
              <h2 id="end-shift-title" style={{ margin: 0, fontSize: 20 }}>End this shift?</h2>
              <p style={{ margin: "8px 0 0", color: colors.text.secondary, fontSize: 14 }}>
                Ending marks the shift completed and releases its machines. It does not post finished-goods stock.
              </p>
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 8, fontSize: 14 }}>
                <div>Shift must be active. This shift is {session.status}.</div>
                <div style={{ color: endBlocked ? "#b91c1c" : colors.text.primary }}>
                  {endBlocked
                    ? `${openIssues} material issue${openIssues === 1 ? "" : "s"} and ${openReturns} return${openReturns === 1 ? "" : "s"} are still open. Post or cancel them before ending.`
                    : "Material issues and returns are posted or cancelled."}
                </div>
                <div style={{ color: colors.text.secondary }}>Output, wastage, QC, and signatures are not required to end the shift.</div>
              </div>
              {endError ? <p style={{ margin: "12px 0 0", color: "#b91c1c" }}>{endError}</p> : null}
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, padding: "14px 24px", borderTop: `1px solid ${colors.border}`, background: "#f8fafc" }}>
              <button type="button" onClick={() => setEndOpen(false)} disabled={ending} style={secondaryButton}>Cancel</button>
              <Link href={`${base}/reconciliation`} style={{ ...secondaryButton, textDecoration: "none" }}>Review checks</Link>
              <button type="button" onClick={confirmEndShift} disabled={ending || endBlocked} style={{ ...primaryButton, opacity: ending || endBlocked ? 0.55 : 1, cursor: ending || endBlocked ? "not-allowed" : "pointer" }}>
                {ending ? "Ending..." : "End Shift"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function materialsStatus(coverageCount: number, readyCount: number, issueCount: number) {
  if (coverageCount > 0 && readyCount === coverageCount) return { label: "READY", tone: "done" as const };
  if (coverageCount > 0 && readyCount < coverageCount) return { label: "SHORT", tone: "warn" as const };
  if (issueCount > 0) return { label: "RECEIVED", tone: "done" as const };
  return { label: "OPEN", tone: "open" as const };
}

function SectionTitle({ title, action }: { title: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "flex-start", marginBottom: 12, flexWrap: "wrap" }}>
      <h2 style={{ margin: 0, fontSize: 17, fontWeight: 600, flex: "0 0 auto" }}>{title}</h2>
      {action ? <div style={{ display: "flex", flex: "1 1 280px", flexWrap: "wrap", gap: "8px 16px", justifyContent: "flex-end", minWidth: 0 }}>{action}</div> : null}
    </div>
  );
}

function MetricBlock({ href, icon, title, status, rows }: { href: string; icon: React.ReactNode; title: string; status: { label: string; tone: "open" | "done" | "warn" }; rows: Array<[string, string]> }) {
  const tone = status.tone === "done" ? "#15803d" : status.tone === "warn" ? "#b45309" : colors.primary[700];
  return (
    <div style={{ border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12, minHeight: 120, background: "#fff" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8, fontSize: 11, fontWeight: 700, letterSpacing: "0.04em", color: colors.text.secondary }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>{icon}{title.toUpperCase()}</span>
        <StatusLink href={href} label={status.label} tone={tone} />
      </div>
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: "flex", justifyContent: "space-between", gap: 8, marginTop: 8, fontSize: 13 }}>
          <span style={{ color: colors.text.secondary }}>{label}</span>
          <strong style={{ textAlign: "right", color: colors.text.primary }}>{value}</strong>
        </div>
      ))}
    </div>
  );
}

function StatusLink({ href, label, tone }: { href: string; label: string; tone: string }) {
  const [hover, setHover] = useState(false);
  return (
    <Link
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        color: tone,
        textDecoration: hover ? "underline" : "none",
        background: hover ? "#e0f2f1" : "transparent",
        borderRadius: 6,
        padding: "3px 6px",
        margin: "-3px -6px -3px 0",
        letterSpacing: "0.04em",
        cursor: "pointer",
      }}
    >
      {label}
    </Link>
  );
}

function SimpleTable({ headers, rows, empty }: { headers: string[]; rows: string[][]; empty: string }) {
  if (rows.length === 0) return <p style={{ margin: 0, color: colors.text.secondary, fontSize: 14 }}>{empty}</p>;
  return (
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 640 }}>
        <thead>
          <tr>{headers.map((header) => <th key={header} style={th}>{header}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex} style={td}>{cell}</td>)}</tr>)}
        </tbody>
      </table>
    </div>
  );
}

const card: React.CSSProperties = { background: colors.surface, border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20 };
const th: React.CSSProperties = { textAlign: "left", fontSize: 12, fontWeight: 600, color: colors.text.secondary, padding: "10px 12px", borderBottom: `1px solid ${colors.border}` };
const td: React.CSSProperties = { fontSize: 14, padding: "12px", borderBottom: `1px solid ${colors.border}` };
const textLink: React.CSSProperties = { color: colors.primary[700], fontWeight: 600, textDecoration: "none", fontSize: 14, whiteSpace: "nowrap" };
const sessionChip: React.CSSProperties = { display: "inline-flex", alignItems: "center", height: 28, padding: "0 10px", borderRadius: 8, background: "#f8fafc", border: "1px solid #cbd5e1", color: "#0f172a", fontSize: 13, fontWeight: 700 };
const shiftBadge: React.CSSProperties = { width: 28, height: 28, borderRadius: 999, display: "inline-flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: 13, fontWeight: 700 };
const primaryButton: React.CSSProperties = { height: 42, padding: "0 16px", display: "inline-flex", alignItems: "center", borderRadius: 8, background: colors.primary[600], color: "white", textDecoration: "none", fontWeight: 700, fontSize: 14, border: "1px solid transparent", cursor: "pointer", boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)" };
const secondaryButton: React.CSSProperties = { height: 42, padding: "0 16px", display: "inline-flex", alignItems: "center", gap: 8, borderRadius: 8, background: "#ffffff", color: colors.text.primary, fontWeight: 700, fontSize: 14, border: "1px solid #94a3b8", boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)", cursor: "pointer" };

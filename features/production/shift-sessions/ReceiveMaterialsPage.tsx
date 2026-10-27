"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { colors } from "@/components/ui/colors";

type IssuedLine = { itemCode: string; itemName: string; uom: string; quantity: number };
type IssuedDocument = {
  id: string;
  publicId: number;
  issueNo: string;
  issueDate: string;
  fromLocationName: string;
  issuedToName: string;
  purpose: string;
  items: IssuedLine[];
};
type Receipt = {
  issueNo: string;
  status: string;
  stockIssueNo: string | null;
  stockIssuePublicId: number | null;
  items: IssuedLine[];
};

export default function ReceiveMaterialsPage({
  sessionNo,
  sessionPath,
  productionDate,
  shiftCode,
  factoryLocationName,
  shiftStatus,
  issueApiPath,
  issued,
  receipts,
}: {
  sessionNo: string;
  sessionPath: string;
  productionDate: string;
  shiftCode: string;
  factoryLocationName: string;
  shiftStatus: string;
  issueApiPath: string;
  issued: IssuedDocument[];
  receipts: Receipt[];
}) {
  const router = useRouter();
  const [busyId, setBusyId] = useState("");
  const [error, setError] = useState("");
  const canReceive = shiftStatus === "ACTIVE";

  async function receive(document: IssuedDocument) {
    setError("");
    setBusyId(document.id);
    try {
      const response = await fetch(issueApiPath, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "receive-issued", stockIssueId: document.id }),
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(typeof payload.error === "string" ? payload.error : `Could not receive ${document.issueNo}.`);
        return;
      }
      router.refresh();
    } catch {
      setError(`Could not receive ${document.issueNo}.`);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16, maxWidth: 1180 }}>
      <div style={titleRow}>
        <h1 style={title}>Receive Materials</h1>
        <Link href={sessionPath} style={backButton}>Back to Session</Link>
      </div>
      <div style={metaRow}>
        <Meta label="Date" value={formatDate(productionDate)} />
        <Meta label="Shift" value={shiftTitle(shiftCode)} />
        <Meta label="Session" value={sessionLabel(sessionNo)} />
        <Meta label="Location" value={factoryLocationName} />
      </div>

      <section style={card}>
        <div style={titleRow}>
          <h2 style={sectionTitle}>Issued, waiting to receive</h2>
          <Link href="/inventory/issues" style={backButton}>Open Stock Issues</Link>
        </div>
        <p style={note}>
          These lines were posted from Inventory → Stock Issue. Receiving them adds the quantity to {factoryLocationName} WIP for this shift. The store quantity stays as it was when the issue was posted.
        </p>
        {!canReceive ? <p style={note}>This shift is closed, so these issues stay listed until an open shift receives them.</p> : null}
        {error ? <p style={{ color: "#b91c1c", marginTop: 0 }}>{error}</p> : null}
        {issued.length === 0 ? (
          <p style={note}>No posted stock issues are waiting for this shift. Issue the materials from Inventory → Stock Issue, then receive them here.</p>
        ) : issued.map((document) => (
          <article key={document.id} style={issueCard}>
            <div style={issueHead}>
              <div>
                <Link href={`/inventory/iss/view/${document.publicId}`} style={issueLink}>{document.issueNo}</Link>
                <div style={issueMeta}>
                  {formatDate(document.issueDate)} · from {document.fromLocationName} · to {document.issuedToName}
                  {document.purpose ? ` · ${document.purpose}` : ""}
                </div>
              </div>
              <button
                type="button"
                onClick={() => receive(document)}
                disabled={!canReceive || busyId !== ""}
                style={{ ...primary, opacity: !canReceive || busyId !== "" ? 0.7 : 1 }}
              >
                {busyId === document.id ? "Receiving..." : "Receive"}
              </button>
            </div>
            <ItemTable items={document.items} quantityLabel="Issued qty" />
          </article>
        ))}
      </section>

      <section style={card}>
        <h2 style={sectionTitle}>Received on this shift</h2>
        <p style={note}>These quantities are in {factoryLocationName} WIP. They do not increase finished-goods stock.</p>
        {receipts.length === 0 ? <p style={note}>No materials received on this shift yet.</p> : receipts.map((receipt) => (
          <article key={receipt.issueNo} style={issueCard}>
            <div style={issueHead}>
              <div>
                <div style={{ fontWeight: 700 }}>{receipt.issueNo}</div>
                <div style={issueMeta}>
                  {receipt.status}
                  {receipt.stockIssueNo && receipt.stockIssuePublicId != null ? (
                    <>
                      {" · from "}
                      <Link href={`/inventory/iss/view/${receipt.stockIssuePublicId}`} style={issueLink}>{receipt.stockIssueNo}</Link>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
            {receipt.items.length === 0 ? <p style={note}>No lines on this receipt.</p> : <ItemTable items={receipt.items} quantityLabel="Received qty" />}
          </article>
        ))}
      </section>
    </div>
  );
}

function ItemTable({ items, quantityLabel }: { items: IssuedLine[]; quantityLabel: string }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          {["Material", "UOM", quantityLabel].map((header) => <th key={header} style={th}>{header}</th>)}
        </tr>
      </thead>
      <tbody>
        {items.map((item) => (
          <tr key={`${item.itemCode}-${item.itemName}`}>
            <td style={td}>{item.itemCode} — {item.itemName}</td>
            <td style={td}>{item.uom || "—"}</td>
            <td style={td}>{formatQty(item.quantity)}</td>
          </tr>
        ))}
      </tbody>
    </table>
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
  const day = String(value).slice(0, 10);
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return value;
  return new Intl.DateTimeFormat("en-KE", { day: "numeric", month: "short", year: "numeric" }).format(new Date(year, month - 1, date));
}

function formatQty(value: number) {
  return new Intl.NumberFormat("en-KE", { maximumFractionDigits: 3 }).format(value || 0);
}

const titleRow: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12 };
const title: React.CSSProperties = { margin: 0, fontSize: 26, fontWeight: 650 };
const sectionTitle: React.CSSProperties = { margin: 0, fontSize: 16, fontWeight: 650 };
const card: React.CSSProperties = { background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 16 };
const issueCard: React.CSSProperties = { border: `1px solid ${colors.border}`, borderRadius: 10, padding: 12, marginTop: 12 };
const issueHead: React.CSSProperties = { display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 8 };
const issueLink: React.CSSProperties = { color: colors.primary[700], fontWeight: 700, textDecoration: "none" };
const issueMeta: React.CSSProperties = { marginTop: 4, fontSize: 13, color: colors.text.secondary };
const note: React.CSSProperties = { margin: "8px 0 0", color: colors.text.secondary, fontSize: 13, lineHeight: 1.45, maxWidth: 860 };
const metaRow: React.CSSProperties = { display: "flex", gap: 12, flexWrap: "wrap" };
const metaCard: React.CSSProperties = { width: 180, background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 10, padding: "10px 12px" };
const th: React.CSSProperties = { textAlign: "left", fontSize: 12, color: colors.text.secondary, padding: "8px 10px", borderBottom: `1px solid ${colors.border}` };
const td: React.CSSProperties = { fontSize: 14, padding: "10px", borderTop: `1px solid ${colors.border}` };
const primary: React.CSSProperties = { height: 42, padding: "0 16px", borderRadius: 8, border: "1px solid #0f766e", background: colors.primary[600], color: "#fff", fontWeight: 700, cursor: "pointer", boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)" };
const backButton: React.CSSProperties = { height: 42, padding: "0 14px", borderRadius: 8, border: "1px solid #94a3b8", background: "#fff", color: colors.text.primary, fontWeight: 700, display: "inline-flex", alignItems: "center", textDecoration: "none", boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)" };

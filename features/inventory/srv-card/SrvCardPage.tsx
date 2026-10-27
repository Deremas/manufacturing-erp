"use client";

import { useState } from "react";
import { CalendarDays, ClipboardList, Hand, Package, Search } from "lucide-react";

import { DecoratedSelect } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";
import type { SrvCardResult, SrvDailyLine } from "@/services/inventory/srv-card.service";

type ItemOption = { value: string; label: string; group?: string };

const PLUS = "#027a48";
const MINUS = "#b42318";
const MUTED = "#9ca3af";

function formatPlain(value: number) {
  return value.toLocaleString("en-KE", { maximumFractionDigits: 2 });
}

function formatDash(value: number, kind: "plus" | "minus" | "signed" | "plain", showZero = false) {
  if (!value && !showZero) {
    return <span style={{ color: MUTED }}>-</span>;
  }
  if (kind === "plain") {
    return <span style={{ color: colors.text.primary, fontWeight: 700 }}>{formatPlain(value)}</span>;
  }
  if (kind === "plus") {
    return <span style={{ color: PLUS, fontWeight: 700 }}>+{formatPlain(value)}</span>;
  }
  if (kind === "minus") {
    return <span style={{ color: MINUS, fontWeight: 700 }}>-{formatPlain(value)}</span>;
  }
  if (!value) {
    return <span style={{ color: colors.text.primary, fontWeight: 700 }}>0</span>;
  }
  const positive = value > 0;
  return (
    <span style={{ color: positive ? PLUS : MINUS, fontWeight: 700 }}>
      {positive ? "+" : "-"}
      {formatPlain(Math.abs(value))}
    </span>
  );
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 8,
  minWidth: 0,
};

const labelStyle: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  fontSize: 13,
  fontWeight: 600,
  color: colors.text.secondary,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  maxWidth: "100%",
  height: 46,
  borderRadius: 12,
  border: `1px solid ${colors.inputBorder}`,
  backgroundColor: colors.surface,
  color: colors.text.primary,
  padding: "0 14px",
  fontSize: typography.sizes.body.fontSize,
  boxSizing: "border-box",
};

const thBase: React.CSSProperties = {
  padding: "12px 10px",
  textAlign: "right",
  fontSize: 11,
  fontWeight: 800,
  letterSpacing: 0.4,
  whiteSpace: "nowrap",
  borderBottom: `1px solid ${colors.border}`,
};

const tdBase: React.CSSProperties = {
  padding: "12px 10px",
  textAlign: "right",
  fontSize: 13,
  borderBottom: `1px solid #f3f4f6`,
  fontVariantNumeric: "tabular-nums",
};

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent: string;
}) {
  return (
    <div
      className="srv-metric-card"
      style={{
        background: "#fff",
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: "16px 16px 14px",
        boxShadow: "0 6px 16px rgba(15, 23, 42, 0.04)",
        borderTop: `3px solid ${accent}`,
        minWidth: 0,
        width: "100%",
        boxSizing: "border-box",
      }}
    >
      <div
        className="srv-metric-value"
        style={{
          fontWeight: 800,
          color: colors.text.primary,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1.15,
          overflowWrap: "anywhere",
        }}
      >
        {formatPlain(value)}
      </div>
      <div
        style={{
          marginTop: 8,
          fontSize: 13,
          fontWeight: 600,
          color: colors.text.secondary,
          lineHeight: 1.3,
        }}
      >
        {label}
      </div>
    </div>
  );
}

function RegisterRow({
  line,
  totals = false,
}: {
  line: SrvDailyLine;
  totals?: boolean;
}) {
  const rowStyle: React.CSSProperties = {
    background: totals ? "#f8fafc" : "#fff",
    fontWeight: totals ? 800 : 500,
  };
  return (
    <tr style={rowStyle}>
      <td style={{ ...tdBase, textAlign: "left", fontWeight: 700, color: colors.text.primary }}>
        {totals ? "TOTALS" : formatDate(line.date)}
      </td>
      <td style={tdBase}>{formatPlain(totals ? 0 : line.opening)}</td>
      <td style={{ ...tdBase, background: totals ? "#ecfdf3" : undefined }}>
        {formatDash(line.received, "plus", totals)}
      </td>
      <td style={{ ...tdBase, background: totals ? "#ecfdf3" : undefined }}>
        {formatDash(line.produced, "plus", totals)}
      </td>
      <td style={{ ...tdBase, background: totals ? "#fef3f2" : undefined }}>
        {formatDash(line.issued, "minus", totals)}
      </td>
      <td style={{ ...tdBase, background: totals ? "#fef3f2" : undefined }}>
        {formatDash(line.sold, "minus", totals)}
      </td>
      <td style={{ ...tdBase, background: totals ? "#fef3f2" : undefined }}>
        {formatDash(line.wastage, "minus", totals)}
      </td>
      <td style={{ ...tdBase, background: totals ? "#f5f3ff" : undefined }}>
        {formatDash(line.adjustTransfer, "signed", totals)}
      </td>
      <td style={{ ...tdBase, fontWeight: 800 }}>{formatPlain(line.closing)}</td>
    </tr>
  );
}

export default function SrvCardPage({ items }: { items: ItemOption[] }) {
  const [itemId, setItemId] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [card, setCard] = useState<SrvCardResult | null>(null);

  async function generateCard() {
    setMessage("");
    if (!itemId) {
      setCard(null);
      setMessage("Select an item to generate the SRV card.");
      return;
    }
    setPending(true);
    try {
      const params = new URLSearchParams({ itemId });
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);
      const response = await fetch(`/api/inventory/srv-card?${params.toString()}`);
      const result = await response.json();
      if (!response.ok) {
        setCard(null);
        setMessage(result.error ?? "Unable to generate the SRV card.");
        return;
      }
      setCard(result);
    } catch (error) {
      setCard(null);
      setMessage(error instanceof Error ? error.message : "Unable to generate the SRV card.");
    } finally {
      setPending(false);
    }
  }

  const selectedLabel = items.find((item) => item.value === itemId)?.label ?? card?.itemCode;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <section
        className="srv-hero"
        style={{
          padding: "28px 32px",
          borderRadius: 22,
          background: "linear-gradient(135deg, #4f46e5 0%, #3730a3 100%)",
          color: "#fff",
          boxShadow: "0 16px 36px rgba(79, 70, 229, 0.22)",
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 14,
            fontSize: 13,
            fontWeight: 600,
            color: "rgba(255,255,255,0.82)",
          }}
        >
          <ClipboardList size={15} />
          Store Requisitions / SRV Card
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            className="srv-hero-icon"
            style={{
              width: 46,
              height: 46,
              borderRadius: 12,
              background: "rgba(255,255,255,0.16)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <ClipboardList size={22} />
          </span>
          <div style={{ minWidth: 0, flex: 1 }}>
            <h1 className="srv-hero-title">
              SRV Card (Stock Card)
            </h1>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: "rgba(255,255,255,0.82)" }}>
              Daily tracking of materials - Issued, Produced, Wastage, and Sales
            </p>
          </div>
        </div>
      </section>

      <section
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          padding: "22px 24px",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
          overflow: "hidden",
        }}
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void generateCard();
          }}
        >
          <div className="srv-card-filters">
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="srv-item">
                <Package size={14} />
                Select Item
              </label>
              <DecoratedSelect
                id="srv-item"
                searchable
                value={itemId}
                placeholder="-- Select Item --"
                options={items}
                onChange={setItemId}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="srv-from">
                <CalendarDays size={14} />
                From Date
              </label>
              <input
                id="srv-from"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                style={inputStyle}
              />
            </div>
            <div style={fieldStyle}>
              <label style={labelStyle} htmlFor="srv-to">
                <CalendarDays size={14} />
                To Date
              </label>
              <input
                id="srv-to"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                style={inputStyle}
              />
            </div>
            <button
              type="submit"
              disabled={pending}
              style={{
                height: 46,
                padding: "0 18px",
                border: 0,
                borderRadius: 999,
                background: "#2563eb",
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                fontWeight: 700,
                fontSize: 14,
                whiteSpace: "nowrap",
                cursor: pending ? "wait" : "pointer",
                boxShadow: "0 8px 16px rgba(37, 99, 235, 0.28)",
                flexShrink: 0,
              }}
            >
              <Search size={16} />
              {pending ? "Generating..." : "Generate Card"}
            </button>
          </div>
        </form>
        {message ? (
          <p style={{ margin: "12px 0 0", color: colors.danger[600], fontSize: 13 }}>{message}</p>
        ) : null}
      </section>

      {!card ? (
        <section
          style={{
            background: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: 18,
            minHeight: 280,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 32,
          }}
        >
          <div style={{ textAlign: "center", maxWidth: 360 }}>
            <div
              style={{
                width: 72,
                height: 72,
                margin: "0 auto 16px",
                borderRadius: "50%",
                background: "#f3f4f6",
                color: "#9ca3af",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Hand size={34} />
            </div>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: colors.text.primary }}>
              Select an Item
            </h2>
            <p style={{ margin: "8px 0 0", fontSize: 14, color: colors.text.muted }}>
              Choose an item from the dropdown above to view its SRV Card
            </p>
          </div>
        </section>
      ) : (
        <>
          <div className="srv-metric-grid">
            <MetricCard label="Opening Balance" value={card.totals.openingBalance} accent="#f59e0b" />
            <MetricCard label="Materials Issued" value={card.totals.issued} accent="#f59e0b" />
            <MetricCard label="Production Output" value={card.totals.produced} accent="#12b76a" />
            <MetricCard label="Total Wastage" value={card.totals.wastage} accent="#f04438" />
            <MetricCard label="Quantity Sold" value={card.totals.sold} accent="#2e90fa" />
            <MetricCard label="Closing Balance" value={card.totals.closingBalance} accent="#7a5af8" />
          </div>

          <section
            style={{
              background: colors.surface,
              border: `1px solid ${colors.border}`,
              borderRadius: 18,
              overflow: "hidden",
              boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                padding: "20px 22px 18px",
                marginBottom: 4,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
                <CalendarDays size={18} color={colors.text.secondary} />
                <h2 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: colors.text.primary }}>
                  Daily Movement Register
                </h2>
              </div>
              <span
                style={{
                  padding: "6px 10px",
                  borderRadius: 999,
                  background: "#eef2ff",
                  color: "#3730a3",
                  fontSize: 12,
                  fontWeight: 700,
                  whiteSpace: "nowrap",
                }}
              >
                {selectedLabel}
              </span>
            </div>

            {card.lines.length === 0 ? (
              <div style={{ padding: 36, textAlign: "center", color: colors.text.muted }}>
                No movements in this period for the selected item.
              </div>
            ) : (
              <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
                  <thead>
                    <tr>
                      <th style={{ ...thBase, textAlign: "left", background: "#f8fafc" }}>DATE</th>
                      <th style={{ ...thBase, background: "#f8fafc" }}>OPENING</th>
                      <th style={{ ...thBase, background: "#ecfdf3", color: PLUS }}>RECEIVED</th>
                      <th style={{ ...thBase, background: "#ecfdf3", color: PLUS }}>PRODUCED</th>
                      <th style={{ ...thBase, background: "#fef3f2", color: MINUS }}>ISSUED (SRV)</th>
                      <th style={{ ...thBase, background: "#fef3f2", color: MINUS }}>SOLD</th>
                      <th style={{ ...thBase, background: "#fef3f2", color: MINUS }}>WASTAGE</th>
                      <th style={{ ...thBase, background: "#f5f3ff", color: "#6941c6" }}>ADJUST. / TRANSFER</th>
                      <th style={{ ...thBase, background: "#f8fafc" }}>CLOSING</th>
                    </tr>
                  </thead>
                  <tbody>
                    {card.lines.map((line) => (
                      <RegisterRow key={line.date} line={line} />
                    ))}
                    <RegisterRow
                      totals
                      line={{
                        date: "totals",
                        opening: 0,
                        received: card.totals.received,
                        produced: card.totals.produced,
                        issued: card.totals.issued,
                        sold: card.totals.sold,
                        wastage: card.totals.wastage,
                        adjustTransfer: card.totals.adjustTransfer,
                        closing: card.totals.closingBalance,
                      }}
                    />
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </>
      )}

      <style>{`
        .srv-hero-title {
          margin: 0;
          font-size: clamp(18px, 4.6vw, 28px);
          line-height: 1.2;
          font-weight: 800;
          color: #fff;
          white-space: nowrap;
        }
        .srv-card-filters {
          display: grid;
          grid-template-columns: minmax(0, 42%) minmax(0, 180px) minmax(0, 180px) auto;
          gap: 16px;
          align-items: end;
          justify-content: start;
        }
        .srv-card-filters > * {
          min-width: 0;
        }
        .srv-metric-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 14px;
        }
        .srv-metric-value {
          font-size: 26px;
        }
        @media (max-width: 720px) {
          .srv-hero {
            padding: 20px 16px !important;
          }
          .srv-hero-title {
            font-size: 18px;
          }
          .srv-hero-icon {
            width: 36px !important;
            height: 36px !important;
          }
          .srv-card-filters {
            grid-template-columns: 1fr 1fr;
          }
          .srv-card-filters > :first-child {
            grid-column: 1 / -1;
          }
          .srv-card-filters button[type="submit"] {
            justify-self: start;
          }
          .srv-metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .srv-metric-value {
            font-size: 22px;
          }
        }
      `}</style>
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";
import {
  ArrowLeftRight,
  CalendarDays,
  ClipboardList,
  MapPin,
  Package,
  Plus,
  Minus,
} from "lucide-react";

import { DecoratedSelect, FormCard } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { typography } from "@/components/ui/typography";
import type {
  ProductionBinCardRegister,
  ProductionBinCardRow,
} from "@/services/inventory/production-bin-card.service";

type Option = { label: string; value: string; group?: string };

const PLUS = "#027a48";
const MINUS_COLOR = "#b42318";
const MUTED = "#9ca3af";
const CURRENCY = "ETB";

const emptyTotals = { totalIn: 0, totalOut: 0, totalInValue: 0, avgCost: 0 };

const fieldStyle: React.CSSProperties = {
  display: "flex",
  flexDirection: "column",
  gap: 6,
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

const requiredMark: React.CSSProperties = {
  color: colors.danger[600],
  fontWeight: 800,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  minWidth: 0,
  height: 46,
  borderRadius: 12,
  border: `1px solid ${colors.inputBorder}`,
  backgroundColor: colors.surface,
  color: colors.text.primary,
  padding: "0 14px",
  fontSize: typography.sizes.body.fontSize,
  boxSizing: "border-box",
};

const errorText: React.CSSProperties = {
  minHeight: 18,
  fontSize: 12,
  color: colors.danger[600],
};

function invalidInput(hasError: boolean): React.CSSProperties {
  return hasError
    ? {
        ...inputStyle,
        border: `1px solid ${colors.danger[500]}`,
        boxShadow: `0 0 0 1px ${colors.danger[50]}`,
      }
    : inputStyle;
}

function formatQty(value: number) {
  return value.toLocaleString("en-KE", {
    minimumFractionDigits: 3,
    maximumFractionDigits: 4,
  });
}

function formatMoney(value: number) {
  return value.toLocaleString("en-KE", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function cellValue(value: number, kind: "qty" | "money") {
  if (!value) return <span style={{ color: MUTED }}>-</span>;
  return kind === "qty" ? formatQty(value) : formatMoney(value);
}

function MetricCard({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent: string;
}) {
  return (
    <div
      style={{
        background: "#fff",
        border: `1px solid ${colors.border}`,
        borderRadius: 16,
        padding: "16px 18px 14px",
        boxShadow: "0 6px 16px rgba(15, 23, 42, 0.04)",
        borderTop: `3px solid ${accent}`,
        minWidth: 0,
      }}
    >
      <div
        style={{
          fontSize: 26,
          lineHeight: 1.15,
          fontWeight: 800,
          color: colors.text.primary,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value}
      </div>
      <div style={{ marginTop: 8, fontSize: 12, fontWeight: 700, color: colors.text.secondary, letterSpacing: 0.4 }}>
        {label}
      </div>
    </div>
  );
}

export default function ProductionBinCardPage({
  itemOptions = [],
  locationOptions = [],
  shiftOptions = [],
}: {
  itemOptions?: Option[];
  locationOptions?: Option[];
  shiftOptions?: Option[];
}) {
  const [form, setForm] = useState({
    itemId: "",
    quantity: "0.0000",
    unitCost: "0.00",
    locationId: "",
    shiftCode: "",
    remarks: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formMessage, setFormMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [filters, setFilters] = useState({ dateFrom: "", dateTo: "", itemId: "" });
  const [register, setRegister] = useState<ProductionBinCardRegister>({
    lines: [],
    totals: emptyTotals,
  });

  function setField(key: keyof typeof form, value: string) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: "" }));
    setFormMessage("");
  }

  function validateForm() {
    const next: Record<string, string> = {};
    if (!form.itemId) next.itemId = "Item is required.";
    const quantity = Number(form.quantity);
    if (!form.quantity.trim() || !Number.isFinite(quantity) || quantity <= 0) {
      next.quantity = "Quantity must be greater than 0.";
    }
    if (!form.locationId) next.locationId = "Location is required.";
    const unitCost = Number(form.unitCost);
    if (form.unitCost.trim() && (!Number.isFinite(unitCost) || unitCost < 0)) {
      next.unitCost = "Unit cost cannot be negative.";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function loadRegister(nextFilters = filters) {
    const params = new URLSearchParams();
    if (nextFilters.itemId) params.set("itemId", nextFilters.itemId);
    if (nextFilters.dateFrom) params.set("dateFrom", nextFilters.dateFrom);
    if (nextFilters.dateTo) params.set("dateTo", nextFilters.dateTo);
    const response = await fetch(`/api/inventory/production-bin-card?${params.toString()}`, {
      cache: "no-store",
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.error ?? "Unable to load production bin card.");
    }
    setRegister({
      lines: Array.isArray(result.lines) ? result.lines : [],
      totals: result.totals ?? emptyTotals,
    });
  }

  useEffect(() => {
    void loadRegister().catch((error) => {
      setFormMessage(error instanceof Error ? error.message : "Unable to load production bin card.");
    });
    // Load the opening register once; later refreshes are explicit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(direction: "add" | "subtract") {
    setFormMessage("");
    if (!validateForm()) return;
    setPending(true);
    try {
      const response = await fetch("/api/inventory/production-bin-card", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemId: form.itemId,
          locationId: form.locationId,
          quantity: Number(form.quantity),
          unitCost: Number(form.unitCost || 0),
          direction,
          remarks: form.remarks,
          shiftCode: form.shiftCode,
        }),
      });
      const result = await response.json();
      if (!response.ok) {
        setFormMessage(result.error ?? "Unable to update stock.");
        if (String(result.error ?? "").toLowerCase().includes("stock")) {
          setErrors((current) => ({ ...current, quantity: result.error }));
        }
        return;
      }
      setForm((current) => ({ ...current, quantity: "0.0000", remarks: "" }));
      await loadRegister(filters);
    } catch (error) {
      setFormMessage(error instanceof Error ? error.message : "Unable to update stock.");
    } finally {
      setPending(false);
    }
  }

  const th: React.CSSProperties = {
    padding: "10px 12px",
    fontSize: 11,
    fontWeight: 800,
    letterSpacing: 0.4,
    textAlign: "right",
    whiteSpace: "nowrap",
    borderBottom: `1px solid ${colors.border}`,
  };
  const td: React.CSSProperties = {
    padding: "11px 12px",
    fontSize: 13,
    textAlign: "right",
    borderBottom: "1px solid #f3f4f6",
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <ClipboardList size={24} color={colors.primary[700]} />
          <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, color: colors.text.primary }}>
            Production Bin Card
          </h1>
        </div>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: colors.text.secondary }}>
          Add or subtract raw material stock with running balance
        </p>
      </div>

      <FormCard title="Add or Subtract Stock" icon={<ArrowLeftRight size={16} />}>
        <div className="pbc-form-grid">
          <div className="pbc-item-field" style={fieldStyle}>
            <label
              style={labelStyle}
              htmlFor="pbc-item"
              onClick={(event) => event.preventDefault()}
            >
              <Package size={14} />
              Item <span style={requiredMark}>*</span>
            </label>
            <DecoratedSelect
              id="pbc-item"
              searchable
              value={form.itemId}
              placeholder="Select Item..."
              options={itemOptions}
              onChange={(value) => setField("itemId", value)}
              invalid={Boolean(errors.itemId)}
              style={invalidInput(Boolean(errors.itemId))}
            />
            <div style={errorText}>{errors.itemId}</div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="pbc-qty">
              Quantity <span style={requiredMark}>*</span>
            </label>
            <input
              id="pbc-qty"
              type="number"
              min="0"
              step="0.0001"
              value={form.quantity}
              onChange={(event) => setField("quantity", event.target.value)}
              style={invalidInput(Boolean(errors.quantity))}
            />
            <div style={errorText}>{errors.quantity}</div>
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="pbc-cost">
              Unit Cost ({CURRENCY})
            </label>
            <input
              id="pbc-cost"
              type="number"
              min="0"
              step="0.01"
              value={form.unitCost}
              onChange={(event) => setField("unitCost", event.target.value)}
              style={invalidInput(Boolean(errors.unitCost))}
            />
            <div style={errorText}>{errors.unitCost}</div>
          </div>
          <div style={fieldStyle}>
            <label
              style={labelStyle}
              htmlFor="pbc-location"
              onClick={(event) => event.preventDefault()}
            >
              <MapPin size={14} />
              Location <span style={requiredMark}>*</span>
            </label>
            <DecoratedSelect
              id="pbc-location"
              searchable
              value={form.locationId}
              placeholder="Select..."
              options={locationOptions}
              onChange={(value) => setField("locationId", value)}
              invalid={Boolean(errors.locationId)}
              style={invalidInput(Boolean(errors.locationId))}
            />
            <div style={errorText}>{errors.locationId}</div>
          </div>
          <div style={fieldStyle}>
            <label
              style={labelStyle}
              htmlFor="pbc-shift"
              onClick={(event) => event.preventDefault()}
            >
              Shift
            </label>
            <DecoratedSelect
              id="pbc-shift"
              value={form.shiftCode}
              placeholder="N/A"
              options={shiftOptions}
              onChange={(value) => setField("shiftCode", value)}
              style={inputStyle}
            />
            <div style={errorText} />
          </div>
        </div>

        <div className="pbc-remarks-row">
          <div style={{ ...fieldStyle, minWidth: 0, flex: "1 1 auto" }}>
            <label style={labelStyle} htmlFor="pbc-remarks">
              Remarks
            </label>
            <input
              id="pbc-remarks"
              value={form.remarks}
              onChange={(event) => setField("remarks", event.target.value)}
              placeholder="Reason for adjustment..."
              style={inputStyle}
            />
          </div>
          <div className="pbc-actions">
            <button
              type="button"
              disabled={pending}
              onClick={() => void submit("add")}
              style={{
                height: 46,
                padding: "0 18px",
                border: 0,
                borderRadius: 12,
                background: colors.primary[600],
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 700,
                cursor: pending ? "wait" : "pointer",
              }}
            >
              <Plus size={16} />
              Add
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => void submit("subtract")}
              style={{
                height: 46,
                padding: "0 18px",
                border: 0,
                borderRadius: 12,
                background: colors.danger[600],
                color: "#fff",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
                fontWeight: 700,
                cursor: pending ? "wait" : "pointer",
              }}
            >
              <Minus size={16} />
              Subtract
            </button>
          </div>
        </div>
        {formMessage ? (
          <p style={{ margin: "10px 0 0", color: colors.danger[600], fontSize: 13 }}>{formMessage}</p>
        ) : null}
      </FormCard>

      <div className="pbc-metric-grid">
        <MetricCard label="TOTAL IN" value={formatQty(register.totals.totalIn)} accent="#12b76a" />
        <MetricCard label="TOTAL OUT" value={formatQty(register.totals.totalOut)} accent="#f04438" />
        <MetricCard
          label="TOTAL IN VALUE"
          value={`${formatMoney(register.totals.totalInValue)} ${CURRENCY}`}
          accent="#2e90fa"
        />
        <MetricCard
          label="AVG COST"
          value={`${formatMoney(register.totals.avgCost)} ${CURRENCY}`}
          accent={colors.primary[600]}
        />
      </div>

      <section
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          padding: "18px 20px",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div className="pbc-filter-row">
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="pbc-from">
              <CalendarDays size={14} />
              FROM DATE
            </label>
            <input
              id="pbc-from"
              type="date"
              value={filters.dateFrom}
              onChange={(event) => setFilters((current) => ({ ...current, dateFrom: event.target.value }))}
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle} htmlFor="pbc-to">
              <CalendarDays size={14} />
              TO DATE
            </label>
            <input
              id="pbc-to"
              type="date"
              value={filters.dateTo}
              onChange={(event) => setFilters((current) => ({ ...current, dateTo: event.target.value }))}
              style={inputStyle}
            />
          </div>
          <div style={fieldStyle}>
            <label style={labelStyle}>ITEM</label>
            <DecoratedSelect
              searchable
              value={filters.itemId}
              placeholder="All Items"
              options={itemOptions}
              onChange={(value) => setFilters((current) => ({ ...current, itemId: value }))}
              style={inputStyle}
            />
          </div>
          <div className="pbc-filter-actions">
            <button
              type="button"
              onClick={() => void loadRegister(filters)}
              style={{
                height: 46,
                padding: "0 20px",
                border: 0,
                borderRadius: 12,
                background: colors.primary[600],
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Filter
            </button>
            <button
              type="button"
              onClick={() => {
                const cleared = { dateFrom: "", dateTo: "", itemId: "" };
                setFilters(cleared);
                void loadRegister(cleared);
              }}
              style={{
                height: 46,
                padding: "0 20px",
                border: 0,
                borderRadius: 12,
                background: "#e5e7eb",
                color: colors.text.primary,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </section>

      <section
        style={{
          background: colors.surface,
          border: `1px solid ${colors.border}`,
          borderRadius: 18,
          overflow: "hidden",
          boxShadow: "0 8px 24px rgba(15, 23, 42, 0.04)",
        }}
      >
        <div className="erp-table-scroll" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 980 }}>
            <thead>
              <tr>
                <th style={{ ...th, textAlign: "left", background: "#f8fafc" }} rowSpan={2}>
                  DATE
                </th>
                <th style={{ ...th, textAlign: "left", background: "#f8fafc" }} rowSpan={2}>
                  REFERENCE
                </th>
                <th style={{ ...th, textAlign: "left", background: "#f8fafc" }} rowSpan={2}>
                  ITEM
                </th>
                <th style={{ ...th, textAlign: "left", background: "#f8fafc" }} rowSpan={2}>
                  LOCATION
                </th>
                <th style={{ ...th, textAlign: "center", background: "#ecfdf3", color: PLUS }} colSpan={3}>
                  RECEIVED (IN)
                </th>
                <th style={{ ...th, textAlign: "center", background: "#fef3f2", color: MINUS_COLOR }} colSpan={3}>
                  ISSUED (OUT)
                </th>
              </tr>
              <tr>
                <th style={{ ...th, background: "#ecfdf3", color: PLUS }}>QTY</th>
                <th style={{ ...th, background: "#ecfdf3", color: PLUS }}>RATE</th>
                <th style={{ ...th, background: "#ecfdf3", color: PLUS }}>VALUE</th>
                <th style={{ ...th, background: "#fef3f2", color: MINUS_COLOR }}>QTY</th>
                <th style={{ ...th, background: "#fef3f2", color: MINUS_COLOR }}>RATE</th>
                <th style={{ ...th, background: "#fef3f2", color: MINUS_COLOR }}>VALUE</th>
              </tr>
            </thead>
            <tbody>
              {register.lines.length === 0 ? (
                <tr>
                  <td colSpan={10} style={{ padding: 48, textAlign: "center", color: colors.text.muted }}>
                    No movements found. Use the form above to add or subtract stock.
                  </td>
                </tr>
              ) : (
                register.lines.map((line: ProductionBinCardRow) => (
                  <tr key={line.id}>
                    <td style={{ ...td, textAlign: "left", fontWeight: 700 }}>{formatDate(line.date)}</td>
                    <td style={{ ...td, textAlign: "left" }}>{line.referenceNo ?? line.movementNumber}</td>
                    <td style={{ ...td, textAlign: "left" }}>{line.itemLabel || line.itemName}</td>
                    <td style={{ ...td, textAlign: "left" }}>{line.locationName}</td>
                    <td style={td}>{cellValue(line.quantityIn, "qty")}</td>
                    <td style={td}>{line.quantityIn ? formatMoney(Number(line.unitCost ?? 0)) : <span style={{ color: MUTED }}>-</span>}</td>
                    <td style={td}>
                      {line.quantityIn ? formatMoney(line.quantityIn * Number(line.unitCost ?? 0)) : <span style={{ color: MUTED }}>-</span>}
                    </td>
                    <td style={td}>{cellValue(line.quantityOut, "qty")}</td>
                    <td style={td}>{line.quantityOut ? formatMoney(Number(line.unitCost ?? 0)) : <span style={{ color: MUTED }}>-</span>}</td>
                    <td style={td}>
                      {line.quantityOut ? formatMoney(line.quantityOut * Number(line.unitCost ?? 0)) : <span style={{ color: MUTED }}>-</span>}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      <style>{`
        .pbc-form-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 16px;
        }
        .pbc-remarks-row {
          display: flex;
          align-items: flex-end;
          gap: 12px;
          width: 100%;
          max-width: 100%;
          margin-top: 4px;
        }
        .pbc-actions {
          display: flex;
          gap: 10px;
          flex: 0 0 auto;
        }
        .pbc-metric-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }
        .pbc-filter-row {
          display: grid;
          grid-template-columns: minmax(0, 180px) minmax(0, 180px) minmax(0, 1fr) auto;
          gap: 16px;
          align-items: end;
        }
        .pbc-filter-actions {
          display: flex;
          gap: 10px;
        }
        @media (max-width: 1100px) {
          .pbc-form-grid,
          .pbc-metric-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .pbc-item-field {
            grid-column: 1 / -1;
          }
          .pbc-filter-row {
            grid-template-columns: 1fr 1fr;
          }
        }
        @media (max-width: 720px) {
          .pbc-form-grid,
          .pbc-metric-grid,
          .pbc-filter-row {
            grid-template-columns: 1fr 1fr;
            gap: 12px;
          }
          .pbc-item-field,
          .pbc-filter-row > :nth-child(3),
          .pbc-filter-actions {
            grid-column: 1 / -1;
          }
          .pbc-remarks-row {
            flex-direction: column;
            align-items: stretch;
          }
          .pbc-actions {
            width: 100%;
          }
          .pbc-actions button {
            flex: 1;
          }
        }
      `}</style>
    </div>
  );
}

"use client";

import {
  DataTable,
  EmptyState,
  MetricCard,
  PageHeader,
  SearchInput,
} from "@/components/shared";
import type { Column } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { typography } from "@/components/ui/typography";
import { publicEditUrl, publicViewUrl } from "@/lib/routing/urls";
import { formatNumberDisplay } from "@/lib/utils/format-number";
import { CircleCheck, Eye, Layers, List, PauseCircle, Pencil, Plus, Search, Users, X } from "lucide-react";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { formatMoney } from "@/lib/utils/format-number";

function gridStyle(): React.CSSProperties {
  return {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
    gap: `${spacing.card.gap}px`,
  };
}

type BomListRow = {
  id: string;
  publicId: number;
  bomNo: string;
  bomName: string;
  finishedGoodCode: string;
  finishedGoodName: string;
  outputQty: number;
  uomName: string | null;
  status: string;
  isDefault: boolean;
  description: string | null;
  createdByName: string | null;
  componentCount: number;
};

function bomStatusLabel(status: string) {
  switch (String(status).toUpperCase()) {
    case "ACTIVE":
      return "Active";
    case "INACTIVE":
      return "Inactive";
    case "ARCHIVED":
      return "Archived";
    default:
      return String(status).replaceAll("_", " ");
  }
}

function bomIconBox(bg: string, fg: string, children: ReactNode) {
  return (
    <div
      style={{
        width: 52,
        height: 52,
        borderRadius: 14,
        backgroundColor: bg,
        color: fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </div>
  );
}

export function BomListPage({ rows }: { rows: BomListRow[] }) {
  const [searchText, setSearchText] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [status, setStatus] = useState("");

  const summary = useMemo(() => {
    const active = rows.filter((row) => String(row.status).toUpperCase() === "ACTIVE").length;
    const inactive = rows.filter((row) => String(row.status).toUpperCase() !== "ACTIVE").length;
    return { total: rows.length, active, inactive };
  }, [rows]);

  const filtered = useMemo(() => {
    const query = appliedSearch.trim().toLowerCase();
    return rows.filter((row) => {
      if (status && String(row.status).toUpperCase() !== status) return false;
      if (!query) return true;
      return [row.bomNo, row.bomName, row.finishedGoodCode, row.finishedGoodName, row.description, row.createdByName]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [rows, appliedSearch, status]);

  const applySearch = () => setAppliedSearch(searchText.trim());
  const clearFilters = () => {
    setSearchText("");
    setAppliedSearch("");
    setStatus("");
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18, minWidth: 0, maxWidth: "100%" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
          <span style={{ color: colors.primary[600], display: "inline-flex" }}>
            <Users size={28} strokeWidth={2.2} />
          </span>
          <div>
            <h1 style={{ margin: 0, fontSize: 26, lineHeight: 1.15, fontWeight: 650, color: colors.text.primary }}>Bill of Materials</h1>
            <p style={{ margin: "4px 0 0", color: colors.text.secondary, fontSize: 14 }}>Product recipes and component lists</p>
          </div>
        </div>
        <Link href="/production/bom/create" style={bomPrimaryButton}>
          <Plus size={16} strokeWidth={2.4} />
          New BOM
        </Link>
      </div>

      <div className="bom-summary-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 16 }}>
        {[
          { label: "Total BOMs", value: summary.total, icon: bomIconBox("#e7f7f4", "#0f8f81", <Users size={24} />) },
          { label: "Active", value: summary.active, icon: bomIconBox("#e8f7ee", "#17803d", <CircleCheck size={24} />) },
          { label: "Inactive", value: summary.inactive, icon: bomIconBox("#fff4e8", "#ea6900", <PauseCircle size={24} />) },
        ].map((card) => (
          <div key={card.label} style={bomCard}>
            {card.icon}
            <div>
              <div style={{ fontSize: 30, lineHeight: 1, fontWeight: 700, color: colors.text.primary }}>{card.value}</div>
              <div style={{ marginTop: 6, fontSize: 14, color: colors.text.secondary }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={{ ...bomCard, display: "block", padding: 18 }}>
        <div className="bom-filter-grid" style={{ display: "flex", alignItems: "flex-end", gap: 12, minWidth: 0 }}>
          <label style={{ ...bomField, flex: "1 1 280px" }}>
            <span style={bomFieldLabel}>Search</span>
            <input
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") applySearch();
              }}
              placeholder="BOM name, product code or name..."
              style={bomInput}
            />
          </label>
          <label style={{ ...bomField, width: 200, flex: "0 0 200px" }}>
            <span style={bomFieldLabel}>Status</span>
            <select value={status} onChange={(event) => setStatus(event.target.value)} style={bomInput}>
              <option value="">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="INACTIVE">Inactive</option>
              <option value="ARCHIVED">Archived</option>
            </select>
          </label>
          <button type="button" onClick={applySearch} style={{ ...bomSearchButton, width: 108, flex: "0 0 108px" }}>
            <Search size={16} />
            Search
          </button>
          <button type="button" onClick={clearFilters} style={{ ...bomClearButton, width: 96, flex: "0 0 96px" }}>
            <X size={16} />
            Clear
          </button>
        </div>
      </div>

      <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 14, overflow: "hidden" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "16px 18px", borderBottom: `1px solid ${colors.border}` }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: colors.text.primary }}>
            <List size={18} color={colors.primary[700]} />
            BOM List
          </div>
          <span style={{ background: colors.primary[600], color: "#fff", borderRadius: 999, padding: "5px 12px", fontSize: 12, fontWeight: 700, letterSpacing: "0.04em" }}>
            {filtered.length} {filtered.length === 1 ? "RECORD" : "RECORDS"}
          </span>
        </div>
        <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
              <colgroup>
                <col style={{ width: "28%" }} />
                <col style={{ width: "18%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "10%" }} />
                <col style={{ width: "8%" }} />
              </colgroup>
              <thead>
                <tr style={{ background: "#f9fafb" }}>
                  {["BOM Name", "Finished Good", "Output Qty", "Components", "Created By", "Status", "Actions"].map((header) => (
                    <th key={header} style={bomTh}>{header}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: "28px 16px" }}>
                      <EmptyState
                        icon={<Layers size={36} />}
                        title={rows.length === 0 ? "No bills of materials" : "No BOMs match these filters"}
                        message={rows.length === 0 ? "Create a recipe to list its finished good and components." : "Clear the search or status to see the full list."}
                      />
                    </td>
                  </tr>
                ) : filtered.map((row) => {
                  const viewHref = publicViewUrl("production.bom", row.publicId);
                  const editHref = publicEditUrl("production.bom", row.publicId);
                  const active = String(row.status).toUpperCase() === "ACTIVE";
                  const unit = (row.uomName || "").trim();
                  return (
                    <tr key={row.id}>
                      <td style={bomTd}>
                        <div style={{ color: colors.text.primary, fontWeight: 700 }}>{row.bomName}</div>
                        {row.description ? <div style={bomSub}>{row.description}</div> : null}
                      </td>
                      <td style={bomTd}>
                        <div style={{ fontWeight: 700 }}>{row.finishedGoodCode}</div>
                        <div style={bomSub}>{row.finishedGoodName}</div>
                      </td>
                      <td style={bomTd}>
                        {formatNumberDisplay(Number(row.outputQty ?? 0), { maximumFractionDigits: 3 })}
                        {unit ? ` ${unit.toUpperCase()}` : ""}
                      </td>
                      <td style={bomTd}>
                        <span style={bomCountPill}>
                          <Layers size={14} />
                          {row.componentCount}
                        </span>
                      </td>
                      <td style={bomTd}>{row.createdByName || "—"}</td>
                      <td style={bomTd}>
                        <span style={active ? bomActivePill : bomInactivePill}>
                          <span style={{ width: 7, height: 7, borderRadius: 99, background: active ? "#16a34a" : "#ea6900" }} />
                          {bomStatusLabel(row.status)}
                        </span>
                      </td>
                      <td style={bomTd}>
                        <span style={{ display: "inline-flex", gap: 4 }}>
                          <Link href={viewHref} title="View" aria-label={`View ${row.bomName}`} style={bomIconButton}><Eye size={16} /></Link>
                          <Link href={editHref} title="Edit" aria-label={`Edit ${row.bomName}`} style={bomIconButton}><Pencil size={16} /></Link>
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
      </div>
      <style jsx>{`
        @media (max-width: 900px) {
          .bom-summary-grid { grid-template-columns: 1fr !important; }
          .bom-filter-grid { flex-wrap: wrap; }
          .bom-filter-grid > label:first-child { flex: 1 1 100% !important; }
        }
      `}</style>
    </div>
  );
}

const bomCard: React.CSSProperties = {
  background: "#fff",
  border: `1px solid ${colors.border}`,
  borderRadius: 14,
  minHeight: 96,
  padding: "16px 18px",
  display: "flex",
  alignItems: "center",
  gap: 14,
};

const bomField: React.CSSProperties = { display: "flex", flexDirection: "column", gap: 6, minWidth: 0 };
const bomFieldLabel: React.CSSProperties = { fontSize: 13, fontWeight: 650, color: colors.text.secondary };
const bomInput: React.CSSProperties = {
  width: "100%",
  height: 42,
  padding: "0 12px",
  borderRadius: 8,
  border: `1px solid ${colors.inputBorder}`,
  background: "#fff",
  color: colors.text.primary,
  fontFamily: typography.fontFamily,
  fontSize: 14,
  boxSizing: "border-box",
};
const bomPrimaryButton: React.CSSProperties = {
  height: 42,
  padding: "0 16px",
  borderRadius: 8,
  border: "1px solid #0f766e",
  background: colors.primary[600],
  color: "#fff",
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  fontWeight: 700,
  textDecoration: "none",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.12)",
  whiteSpace: "nowrap",
};
const bomSearchButton: React.CSSProperties = { ...bomPrimaryButton, width: "100%" };
const bomClearButton: React.CSSProperties = {
  ...bomPrimaryButton,
  width: "100%",
  background: "#fff",
  color: colors.text.primary,
  border: "1px solid #94a3b8",
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.08)",
};
const bomTh: React.CSSProperties = {
  textAlign: "left",
  padding: "12px 14px",
  color: colors.text.secondary,
  fontSize: 12,
  fontWeight: 700,
  letterSpacing: "0.04em",
  textTransform: "uppercase",
  borderBottom: `1px solid ${colors.border}`,
  whiteSpace: "nowrap",
};
const bomTd: React.CSSProperties = {
  padding: "14px",
  borderBottom: `1px solid ${colors.border}`,
  verticalAlign: "middle",
  fontSize: 14,
  color: colors.text.primary,
};
const bomSub: React.CSSProperties = {
  marginTop: 3,
  color: colors.text.secondary,
  fontSize: 12,
  fontWeight: 500,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
};
const bomCountPill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 28,
  padding: "0 10px",
  borderRadius: 999,
  background: "#e7f6f4",
  color: "#0f766e",
  fontWeight: 700,
  fontSize: 13,
};
const bomActivePill: React.CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  gap: 6,
  height: 26,
  padding: "0 10px",
  borderRadius: 999,
  background: "#e8f7ee",
  color: "#166534",
  fontWeight: 700,
  fontSize: 12,
};
const bomInactivePill: React.CSSProperties = {
  ...bomActivePill,
  background: "#fff4e8",
  color: "#9a3412",
};
const bomIconButton: React.CSSProperties = {
  width: 32,
  height: 32,
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  borderRadius: 8,
  color: colors.primary[700],
  textDecoration: "none",
};

export function CostSettingsListPage({
  rows,
}: {
  rows: Array<{
    id: string;
    categoryName: string;
    allocationMethod: string;
    rate: number;
    effectiveFrom: string;
    status: string;
    description: string | null;
  }>;
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [
        row.categoryName,
        row.allocationMethod,
        row.status,
        row.description ?? "",
      ].some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rows, search]);
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "categoryName", label: "Category" },
    { key: "allocationMethod", label: "Allocation Method" },
    {
      key: "rate",
      label: "Rate",
      render: (value) => formatMoney(Number(value ?? 0)),
    },
    {
      key: "effectiveFrom",
      label: "Effective From",
      render: (value) => new Date(String(value)).toLocaleDateString("en-KE"),
    },
    { key: "status", label: "Status" },
    { key: "description", label: "Description" },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        title="Cost Settings"
        subtitle="Configured production overhead rates used for batch and daily costing."
        breadcrumbs={[
          { label: "Production", href: "/production" },
          { label: "Cost Settings" },
        ]}
      />
      <div style={gridStyle()}>
        <MetricCard label="Total Rates" value={filtered.length} />
        <MetricCard
          label="Active Rates"
          value={filtered.filter((row) => row.status === "ACTIVE").length}
        />
        <MetricCard
          label="Fixed/Shift"
          value={
            filtered.filter((row) => row.allocationMethod === "FIXED_PER_SHIFT")
              .length
          }
        />
        <MetricCard
          label="Per Unit"
          value={
            filtered.filter((row) => row.allocationMethod === "COST_PER_UNIT")
              .length
          }
        />
      </div>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder="Search cost settings..."
      />
      <DataTable
        columns={columns}
        data={filtered}
        pageSize={15}
        emptyState={
          <EmptyState
            title="No Cost Settings"
            message="No overhead cost settings are configured yet."
          />
        }
      />
    </div>
  );
}

export function BatchCostReportPage({
  rows,
}: {
  rows: Array<{
    batchNo: string;
    productionDate: string;
    shiftCode: string;
    productCode: string;
    productName: string;
    producedQty: number;
    acceptedQty: number;
    materialCost: number;
    wastageCost: number;
    overheadCost: number;
    laborCost: number;
    totalCost: number;
    costPerUnit: number;
    status: string;
  }>;
}) {
  const columns: Column<(typeof rows)[number]>[] = [
    { key: "batchNo", label: "Batch No" },
    {
      key: "productionDate",
      label: "Date",
      render: (value) => new Date(String(value)).toLocaleDateString("en-KE"),
    },
    { key: "shiftCode", label: "Shift" },
    { key: "productCode", label: "Product Code" },
    { key: "productName", label: "Product" },
    { key: "producedQty", label: "Produced" },
    { key: "acceptedQty", label: "Accepted" },
    {
      key: "materialCost",
      label: "Material Cost",
      render: (value) => formatMoney(Number(value ?? 0)),
    },
    {
      key: "wastageCost",
      label: "Wastage Cost",
      render: (value) => formatMoney(Number(value ?? 0)),
    },
    {
      key: "overheadCost",
      label: "Overhead",
      render: (value) => formatMoney(Number(value ?? 0)),
    },
    {
      key: "totalCost",
      label: "Total Cost",
      render: (value) => formatMoney(Number(value ?? 0)),
    },
    {
      key: "costPerUnit",
      label: "Cost / Unit",
      render: (value) => formatMoney(Number(value ?? 0)),
    },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        title="Batch Cost Report"
        subtitle="Actual production cost per batch from posted issues, finished goods output, and active overhead settings."
        breadcrumbs={[
          { label: "Production", href: "/production" },
          { label: "Batch Cost Report" },
        ]}
      />
      <DataTable
        columns={columns}
        data={rows}
        pageSize={15}
        emptyState={
          <EmptyState
            title="No Batch Costs"
            message="No posted production batches are available yet."
          />
        }
      />
    </div>
  );
}

export function DailyCostSummaryPage({
  rows,
}: {
  rows: Array<{
    productionDate: string;
    shiftCode: string;
    productCode: string;
    productName: string;
    totalProduced: number;
    totalAccepted: number;
    totalRejected: number;
    totalCost: number;
    averageCostPerUnit: number;
  }>;
}) {
  const columns: Column<(typeof rows)[number]>[] = [
    {
      key: "productionDate",
      label: "Date",
      render: (value) => new Date(String(value)).toLocaleDateString("en-KE"),
    },
    { key: "shiftCode", label: "Shift" },
    { key: "productCode", label: "Product Code" },
    { key: "productName", label: "Product" },
    { key: "totalProduced", label: "Produced" },
    { key: "totalAccepted", label: "Accepted" },
    { key: "totalRejected", label: "Rejected" },
    {
      key: "totalCost",
      label: "Total Cost",
      render: (value) => formatMoney(Number(value ?? 0)),
    },
    {
      key: "averageCostPerUnit",
      label: "Average Cost / Unit",
      render: (value) => formatMoney(Number(value ?? 0)),
    },
  ];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: `${spacing.page.gap}px`,
      }}
    >
      <PageHeader
        title="Daily Cost Summary"
        subtitle="Daily production cost rollup by shift and finished good from real batch postings."
        breadcrumbs={[
          { label: "Production", href: "/production" },
          { label: "Daily Cost Summary" },
        ]}
      />
      <DataTable
        columns={columns}
        data={rows}
        pageSize={15}
        emptyState={
          <EmptyState
            title="No Daily Cost Summary"
            message="No daily production costing rows are available yet."
          />
        }
      />
    </div>
  );
}

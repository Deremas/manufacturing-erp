"use client";

import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Calculator,
  CalendarClock,
  CheckCircle2,
  FlaskConical,
  Landmark,
  Package2,
  ShoppingBag,
  ShoppingCart,
  Truck,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

import {
  ReportEmptyState,
  ReportExportActions,
  ReportHeader,
  ReportKpiGrid,
  ReportPageShell,
  ReportTable,
} from "@/components/reporting";
import type { Breadcrumb, Column } from "@/components/shared";
import { SearchInput } from "@/components/shared";
import type { InventoryReportRow } from "@/services/inventory/inventory-insights.service";
import type { AccessibleReportGroup } from "@/services/reports/report-access.service";
import { buildReportIndexExportRows } from "@/services/reports/report-export.service";

function resolveReportIcon(icon: string) {
  switch (icon) {
    case "Package2":
      return <Package2 size={18} />;
    case "ShoppingCart":
      return <ShoppingCart size={18} />;
    case "FlaskConical":
      return <FlaskConical size={18} />;
    case "CalendarClock":
      return <CalendarClock size={18} />;
    case "CheckCircle2":
      return <CheckCircle2 size={18} />;
    case "ShoppingBag":
      return <ShoppingBag size={18} />;
    case "Wallet":
      return <Wallet size={18} />;
    case "Calculator":
      return <Calculator size={18} />;
    case "Landmark":
      return <Landmark size={18} />;
    case "Users":
      return <Users size={18} />;
    case "Truck":
      return <Truck size={18} />;
    default:
      return <BarChart3 size={18} />;
  }
}

interface InventoryReportsPageProps {
  groups: AccessibleReportGroup[];
  transfers: InventoryReportRow[];
  adjustments: InventoryReportRow[];
  issues: InventoryReportRow[];
  returns: InventoryReportRow[];
  requisitions: InventoryReportRow[];
  refreshedAt: string;
}

function ModuleCard({ group }: { group: AccessibleReportGroup }) {
  return (
    <section
      id={group.key}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "20px 24px",
        borderRadius: "16px",
        border: "1px solid #e5e7eb",
        background: "#ffffff",
        boxShadow: "0 8px 22px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "12px" }}>
        <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: "#ecfeff",
              color: "#0f766e",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            {resolveReportIcon(group.icon)}
          </div>
          <div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>{group.title}</div>
            <div style={{ marginTop: 4, color: "#667085", lineHeight: "22px" }}>
              {group.description}
            </div>
          </div>
        </div>
        <div
          style={{
            padding: "6px 10px",
            borderRadius: 999,
            background: "#ccfbf1",
            color: "#115e59",
            fontSize: 12,
            fontWeight: 700,
            whiteSpace: "nowrap",
          }}
        >
          {group.reportCount} reports
        </div>
      </div>

      {group.links.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {group.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "16px",
                padding: "12px 14px",
                borderRadius: "12px",
                border: "1px solid #e5e7eb",
                background: "#ffffff",
                textDecoration: "none",
                color: "#111827",
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600 }}>{link.title}</div>
                <div style={{ marginTop: 2, color: "#667085", fontSize: 13, lineHeight: "20px" }}>
                  {link.description}
                </div>
              </div>
              <ArrowRight size={16} color="#0f766e" />
            </Link>
          ))}
        </div>
      ) : (
        <ReportEmptyState
          title={`${group.title} reports are being completed`}
          message="This report group is reserved in the central hub, but no live routes are ready to show yet."
        />
      )}
    </section>
  );
}

function LiveInventorySection({
  title,
  rows,
}: {
  title: string;
  rows: InventoryReportRow[];
}) {
  const [search, setSearch] = useState("");
  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return rows;
    return rows.filter((row) =>
      [row.documentNo, row.locationName, row.counterpartyName, row.status, row.remarks]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query)),
    );
  }, [rows, search]);

  const columns: Column<InventoryReportRow>[] = [
    { key: "documentNo", label: "Document No" },
    {
      key: "documentDate",
      label: "Date",
      render: (value) => new Date(String(value)).toLocaleDateString("en-KE"),
    },
    { key: "status", label: "Status" },
    { key: "locationName", label: "Location" },
    { key: "counterpartyName", label: "Counterparty / Reason" },
    { key: "itemCount", label: "Items" },
    { key: "remarks", label: "Remarks" },
  ];

  return (
    <section style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div style={{ fontSize: 20, fontWeight: 700 }}>{title}</div>
      <SearchInput
        value={search}
        onChange={setSearch}
        placeholder={`Search ${title.toLowerCase()}...`}
      />
      <ReportTable
        columns={columns}
        data={filtered}
        pageSize={10}
        emptyState={
          <ReportEmptyState
            title={`No ${title}`}
            message={`No ${title.toLowerCase()} records were found for the current scope.`}
          />
        }
      />
    </section>
  );
}

export default function InventoryReportsPage({
  groups,
  transfers,
  adjustments,
  issues,
  returns,
  requisitions,
  refreshedAt,
}: InventoryReportsPageProps) {
  const breadcrumbs: Breadcrumb[] = [{ label: "Reports", href: "/reports" }];
  const exportRows = buildReportIndexExportRows(groups);

  return (
    <ReportPageShell
      hero={
        <ReportHeader
          title="Reports"
          subtitle="View live inventory, procurement, production, shift, quality, sales, receivables, accounting, and fleet reports from one central workspace."
          breadcrumbs={breadcrumbs}
          refreshedAt={refreshedAt}
          actions={
            <ReportExportActions fileName="report-index" rows={exportRows} />
          }
        />
      }
      kpis={
        <ReportKpiGrid
          items={[
            { label: "Report Groups", value: groups.length },
            {
              label: "Live Report Links",
              value: groups.reduce((sum, group) => sum + group.reportCount, 0),
            },
            { label: "Inventory Live Sections", value: 5 },
          ]}
        />
      }
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "16px",
        }}
      >
        {groups.map((group) => (
          <ModuleCard key={group.key} group={group} />
        ))}
      </div>

      <LiveInventorySection title="Transfer Report" rows={transfers} />
      <LiveInventorySection title="Adjustment Report" rows={adjustments} />
      <LiveInventorySection title="Issue Report" rows={issues} />
      <LiveInventorySection title="Return Report" rows={returns} />
      <LiveInventorySection title="Store Requisition Report" rows={requisitions} />
    </ReportPageShell>
  );
}

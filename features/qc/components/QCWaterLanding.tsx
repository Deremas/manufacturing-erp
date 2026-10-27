"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Archive,
  Beaker,
  ClipboardCheck,
  Droplets,
  FileBarChart,
  FlaskConical,
  Lock,
  PauseCircle,
  ShieldAlert,
} from "lucide-react";

import { colors } from "@/components/ui/colors";
import { QCStatusBadge } from "./QCStatusBadge";

type Kpis = {
  openNc?: number;
  productsOnHold?: number;
  recentCip?: number;
  retentionSamples?: number;
};

type NcRow = {
  id: string;
  ncNo: string;
  issueDescription: string;
  status: string;
  createdAt?: string;
  itemName?: string | null;
  batchNo?: string | null;
};

type HoldRow = {
  id: string;
  decisionNo: string;
  reason: string;
  status: string;
  recordDate?: string;
  itemName?: string | null;
  batchNo?: string | null;
  quantity?: number | null;
};

const LAB_CARDS = [
  {
    href: "/qc/water/raw-water",
    title: "Raw Water Test",
    form: "OF/MM/QC/01",
    purpose: "Incoming source water parameters",
    icon: <Droplets size={18} />,
    tone: { bg: "#e0f2f1", fg: "#00796b" },
  },
  {
    href: "/qc/microbial",
    title: "Microbiology",
    form: "OF/QC/016",
    purpose: "Processing water micro analysis",
    icon: <FlaskConical size={18} />,
    tone: { bg: "#ecfdf5", fg: "#047857" },
  },
  {
    href: "/qc/physicochemical",
    title: "Physico-Chemical",
    form: "OF/MM/QC/19",
    purpose: "Hourly purified water chemistry",
    icon: <Beaker size={18} />,
    tone: { bg: "#eff6ff", fg: "#2563eb" },
  },
  {
    href: "/qc/chlorine-residual",
    title: "Chlorine Residual",
    form: "OF/MM/QC/12",
    purpose: "Repeat residual chlorine readings",
    icon: <Droplets size={18} />,
    tone: { bg: "#fff7ed", fg: "#ea580c" },
  },
  {
    href: "/qc/treatment-monitoring",
    title: "Treatment Monitoring",
    form: "OF/QC/011",
    purpose: "Filter and disinfection process sheet",
    icon: <ClipboardCheck size={18} />,
    tone: { bg: "#f5f3ff", fg: "#7c3aed" },
  },
];

const RECORD_CARDS = [
  { href: "/qc/cip", title: "CIP Records", form: "QC-CIP", purpose: "Cleaning cycle verification", icon: <ClipboardCheck size={18} />, tone: { bg: "#e0f2f1", fg: "#00796b" } },
  { href: "/qc/retention-samples", title: "Retention Samples", form: "QC-RET", purpose: "Retain until / disposal log", icon: <Archive size={18} />, tone: { bg: "#eff6ff", fg: "#2563eb" } },
  { href: "/qc/nonconformity", title: "Nonconformity", form: "QC-NCR", purpose: "Quality nonconformity records", icon: <ShieldAlert size={18} />, tone: { bg: "#fef2f2", fg: "#dc2626" } },
  { href: "/qc/hold-release", title: "Product Hold / Release", form: "QC-HLD", purpose: "Standalone QC hold decision", icon: <PauseCircle size={18} />, tone: { bg: "#fff7ed", fg: "#ea580c" } },
];

const surfaceCard: React.CSSProperties = {
  background: "white",
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  boxShadow: "0 1px 2px rgba(15, 23, 42, 0.04)",
};

function formatLongDate(value = new Date()) {
  return value.toLocaleDateString("en-GB", {
    weekday: "long",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(value?: string) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3
      style={{
        margin: "0 0 12px",
        fontSize: 12,
        fontWeight: 700,
        letterSpacing: "0.08em",
        textTransform: "uppercase",
        color: colors.text.muted,
      }}
    >
      {children}
    </h3>
  );
}

function KpiCard({
  href,
  label,
  value,
  icon,
  tone,
}: {
  href: string;
  label: string;
  value: number;
  icon: React.ReactNode;
  tone: { bg: string; fg: string };
}) {
  return (
    <Link
      href={href}
      className="qc-water-kpi-card"
      style={{
        ...surfaceCard,
        display: "flex",
        alignItems: "center",
        gap: 14,
        padding: "16px 18px",
        minHeight: 84,
        color: "inherit",
        textDecoration: "none",
      }}
    >
      <span
        style={{
          width: 40,
          height: 40,
          borderRadius: 12,
          background: tone.bg,
          color: tone.fg,
          display: "grid",
          placeItems: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.1, color: colors.text.primary }}>{value}</div>
        <div style={{ marginTop: 4, fontSize: 13, color: colors.text.secondary }}>{label}</div>
      </div>
    </Link>
  );
}

function ActionCard({
  href,
  title,
  form,
  purpose,
  icon,
  tone,
}: {
  href: string;
  title: string;
  form: string;
  purpose: string;
  icon: React.ReactNode;
  tone: { bg: string; fg: string };
}) {
  return (
    <Link href={href} className="qc-water-action-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
        <span
          style={{
            width: 36,
            height: 36,
            borderRadius: 10,
            background: tone.bg,
            color: tone.fg,
            display: "grid",
            placeItems: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            minHeight: 22,
            padding: "2px 8px",
            borderRadius: 999,
            background: "#f1f5f9",
            color: colors.text.muted,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: 0.2,
          }}
        >
          {form}
        </span>
      </div>
      <strong style={{ fontSize: 15, color: colors.text.primary }}>{title}</strong>
      <p style={{ margin: 0, color: colors.text.secondary, fontSize: 13, lineHeight: 1.45 }}>{purpose}</p>
      <span className="qc-water-action-card-open">Open form →</span>
    </Link>
  );
}

function ClickableRow({ href, children }: { href: string; children: React.ReactNode }) {
  const router = useRouter();
  return (
    <tr
      role="link"
      tabIndex={0}
      onClick={() => router.push(href)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          router.push(href);
        }
      }}
      style={{ cursor: "pointer" }}
    >
      {children}
    </tr>
  );
}

function TableShell({
  title,
  href,
  columns,
  children,
  empty,
}: {
  title: string;
  href: string;
  columns: string[];
  children: React.ReactNode;
  empty: boolean;
}) {
  return (
    <section style={{ ...surfaceCard, padding: 18, display: "grid", gap: 12, minWidth: 0 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
        <strong>{title}</strong>
        <Link href={href} style={{ color: colors.primary[700], fontSize: 13, fontWeight: 600 }}>
          View all →
        </Link>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column}
                  style={{
                    textAlign: "left",
                    padding: "8px 10px",
                    color: colors.text.muted,
                    fontWeight: 600,
                    fontSize: 11,
                    letterSpacing: 0.04,
                    textTransform: "uppercase",
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                >
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {children}
            {empty ? (
              <tr>
                <td colSpan={columns.length} style={{ padding: "16px 10px", color: colors.text.muted }}>
                  Nothing open
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function QCWaterLanding({
  companyName,
  productionCount,
  kpis,
  openNonconformities,
  activeHolds,
}: {
  companyName?: string;
  productionCount?: number;
  kpis: Kpis;
  openNonconformities: NcRow[];
  activeHolds: HoldRow[];
}) {
  const factoryLabel = companyName?.trim() || "the factory";

  return (
    <div className="qc-water-landing" style={{ display: "grid", gap: 22, maxWidth: 1600 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          flexWrap: "wrap",
          padding: "28px 32px",
          background: `linear-gradient(135deg, ${colors.primary[700]} 0%, ${colors.primary[900]} 100%)`,
          borderRadius: 18,
          color: colors.text.inverse,
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em" }}>Water Quality Control</h1>
          <p style={{ margin: "8px 0 0", color: "rgba(255,255,255,0.82)", fontSize: 14 }}>
            QC forms & records for {factoryLabel}
          </p>
        </div>
        <span
          style={{
            background: "rgba(255,255,255,0.14)",
            padding: "8px 14px",
            borderRadius: 999,
            fontSize: 13,
            fontWeight: 600,
            whiteSpace: "nowrap",
          }}
        >
          {formatLongDate()}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
        <KpiCard
          href="/qc/nonconformity"
          label="Open Nonconformities"
          value={kpis.openNc ?? 0}
          icon={<AlertTriangle size={18} />}
          tone={{ bg: "#fef2f2", fg: colors.danger[600] }}
        />
        <KpiCard
          href="/qc/hold-release"
          label="Products on Hold"
          value={kpis.productsOnHold ?? 0}
          icon={<PauseCircle size={18} />}
          tone={{ bg: "#fff7ed", fg: colors.warning[600] }}
        />
        <KpiCard
          href="/qc/cip"
          label="Recent CIP Records"
          value={kpis.recentCip ?? 0}
          icon={<ClipboardCheck size={18} />}
          tone={{ bg: colors.primary[50], fg: colors.primary[700] }}
        />
        <KpiCard
          href="/qc/retention-samples"
          label="Retention Samples"
          value={kpis.retentionSamples ?? 0}
          icon={<Archive size={18} />}
          tone={{ bg: "#eff6ff", fg: colors.info[600] }}
        />
      </div>

      <section>
        <SectionLabel>Laboratory testing</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {LAB_CARDS.map((card) => (
            <ActionCard key={card.href} {...card} />
          ))}
        </div>
      </section>

      <section>
        <SectionLabel>Quality records</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          {RECORD_CARDS.map((card) => (
            <ActionCard key={card.href} {...card} />
          ))}
          <ActionCard
            href="/qc/water/ledger"
            title="Production QC ledger"
            form="STAGE QC"
            purpose={
              productionCount != null
                ? `${productionCount} production-task water tests`
                : "Existing production-stage water tests remain available."
            }
            icon={<ClipboardCheck size={18} />}
            tone={{ bg: "#f1f5f9", fg: "#475569" }}
          />
        </div>
      </section>

      <section>
        <SectionLabel>Reporting</SectionLabel>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
          <ActionCard
            href="/reports/qc/water-tests"
            title="Monthly Report"
            form="QC-RPT"
            purpose="Water test register and outcome trend"
            icon={<FileBarChart size={18} />}
            tone={{ bg: "#e0f2f1", fg: "#00796b" }}
          />
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 14 }}>
        <TableShell
          title="Open Nonconformities"
          href="/qc/nonconformity"
          columns={["Date", "Item", "Qty", "Status"]}
          empty={openNonconformities.length === 0}
        >
          {openNonconformities.map((row) => (
            <ClickableRow key={row.id} href={`/qc/nonconformity/${row.id}`}>
              <td style={{ padding: "10px", borderBottom: `1px solid ${colors.border}` }}>{formatShortDate(row.createdAt)}</td>
              <td style={{ padding: "10px", borderBottom: `1px solid ${colors.border}` }}>
                {row.itemName || row.issueDescription || row.ncNo}
              </td>
              <td style={{ padding: "10px", borderBottom: `1px solid ${colors.border}`, color: colors.text.muted }}>—</td>
              <td style={{ padding: "10px", borderBottom: `1px solid ${colors.border}` }}>
                <QCStatusBadge status={row.status} />
              </td>
            </ClickableRow>
          ))}
        </TableShell>

        <TableShell
          title="Active Product Holds"
          href="/qc/hold-release"
          columns={["Product", "Batch", "Hold Date", ""]}
          empty={activeHolds.length === 0}
        >
          {activeHolds.map((row) => (
            <ClickableRow key={row.id} href={`/qc/hold-release/${row.id}`}>
              <td style={{ padding: "10px", borderBottom: `1px solid ${colors.border}` }}>
                {row.itemName || row.reason || row.decisionNo}
              </td>
              <td style={{ padding: "10px", borderBottom: `1px solid ${colors.border}` }}>{row.batchNo || "—"}</td>
              <td style={{ padding: "10px", borderBottom: `1px solid ${colors.border}` }}>{formatShortDate(row.recordDate)}</td>
              <td style={{ padding: "10px", borderBottom: `1px solid ${colors.border}`, textAlign: "right", color: colors.primary[700] }}>
                <Lock size={14} />
              </td>
            </ClickableRow>
          ))}
        </TableShell>
      </div>
    </div>
  );
}

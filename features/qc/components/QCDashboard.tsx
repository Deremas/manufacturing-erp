"use client";

import Link from "next/link";
import { Beaker, ClipboardCheck, Droplets, FileSearch, ShieldAlert } from "lucide-react";

import { HeroBanner, MetricCard } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { QCResultBadge } from "./QCResultBadge";
import { QCStatusBadge } from "./QCStatusBadge";

const cardStyle: React.CSSProperties = {
  background: "white",
  border: `1px solid ${colors.border}`,
  borderRadius: 16,
  padding: 18,
  display: "grid",
  gap: 8,
  minHeight: 140,
};

function FormCard({
  href,
  title,
  form,
  purpose,
  count,
  icon,
}: {
  href: string;
  title: string;
  form: string;
  purpose: string;
  count?: number;
  icon: React.ReactNode;
}) {
  return (
    <div style={cardStyle}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
        <span style={{ color: colors.primary[700] }}>{icon}</span>
        {count != null ? <QCStatusBadge status={String(count)} /> : null}
      </div>
      <strong>{title}</strong>
      <small style={{ color: colors.text.muted }}>{form}</small>
      <p style={{ margin: 0, color: colors.text.secondary, fontSize: 13 }}>{purpose}</p>
      <Link href={href} style={{ color: colors.primary[700], fontWeight: 600 }}>Open Form</Link>
    </div>
  );
}

export function QCDashboardPage({
  kpis,
  formCounts,
  openNonconformities,
  activeHolds,
  pendingApprovals,
  recentFailed,
}: {
  kpis: Record<string, number>;
  formCounts: Record<string, number>;
  openNonconformities: Array<{ id: string; ncNo: string; issueDescription: string; severity: string; status: string }>;
  activeHolds: Array<{ id: string; decisionNo: string; reason: string; status: string }>;
  pendingApprovals: Array<{ id: string; recordNo: string; formTitleSnapshot: string; status: string; slug: string }>;
  recentFailed: Array<{ id: string; recordNo: string; formTitleSnapshot: string; result: string; slug: string }>;
}) {
  return (
    <div style={{ display: "grid", gap: 22, maxWidth: 1600 }}>
      <HeroBanner
        title="Quality Check"
        subtitle="One QC Tests module for laboratory checks, production inspections, and quality-system records."
        icon={<ClipboardCheck size={28} />}
        actions={<span style={{ background: "rgba(255,255,255,0.16)", padding: "8px 12px", borderRadius: 999 }}>{new Date().toLocaleDateString()}</span>}
      />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14 }}>
        <MetricCard label="Open Nonconformities" value={kpis.openNc ?? 0} />
        <MetricCard label="Products on Hold" value={kpis.productsOnHold ?? 0} />
        <MetricCard label="Recent CIP Records" value={kpis.recentCip ?? 0} />
        <MetricCard label="Retention Samples" value={kpis.retentionSamples ?? 0} />
        <MetricCard label="Tests Today" value={kpis.testsToday ?? 0} />
        <MetricCard label="Passed Today" value={kpis.passedToday ?? 0} />
        <MetricCard label="Failed Today" value={kpis.failedToday ?? 0} />
        <MetricCard label="Pending Approval" value={kpis.pendingApproval ?? 0} />
        <MetricCard label="Tests Awaiting Result" value={kpis.awaitingResult ?? 0} />
      </div>

      <section>
        <h3>QC TESTS</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <FormCard href="/qc/water" title="Water Test" form="OF/MM/QC/01" purpose="Incoming raw water checks" count={formCounts["raw-water"]} icon={<Droplets size={18} />} />
          <FormCard href="/qc/chlorine-residual" title="Chlorine Residual" form="OF/MM/QC/12" purpose="Repeat chlorine ppm readings" count={formCounts["chlorine-residual"]} icon={<Droplets size={18} />} />
          <FormCard href="/qc/treatment-monitoring" title="Treatment Monitoring" form="OF/QC/011" purpose="Process filter and disinfection sheet" count={formCounts["treatment-monitoring"]} icon={<ClipboardCheck size={18} />} />
          <FormCard href="/qc/physicochemical" title="Physico-Chemical" form="OF/MM/QC/19" purpose="Hourly purified water readings" count={formCounts.physicochemical} icon={<Beaker size={18} />} />
          <FormCard href="/qc/master-data" title="QC Master Data" form="SETUP" purpose="Controlled forms, limits and sample points" icon={<ClipboardCheck size={18} />} />
          <FormCard href="/qc/production-output" title="Production Output QC" form="STAGE QC" purpose="Inspect production output by mapped test type" icon={<ClipboardCheck size={18} />} />
          <FormCard href="/qc/microbial" title="Microbial Test" form="OF/QC/016" purpose="Delayed microbial analysis" count={formCounts.microbial} icon={<Beaker size={18} />} />
          <FormCard href="/qc/preform" title="Preform Inspection" form="OF/MM/QC/26" purpose="Incoming preform visual and weight" count={formCounts.preform} icon={<ClipboardCheck size={18} />} />
          <FormCard href="/qc/handle" title="Handle Inspection" form="OF/QC/021" purpose="Handle visual, weight and fitment" count={formCounts.handle} icon={<ClipboardCheck size={18} />} />
          <FormCard href="/qc/cap" title="Cap Inspection" form="OF/MM/QC/49" purpose="Cap visual and lab decision" count={formCounts.cap} icon={<ClipboardCheck size={18} />} />
          <FormCard href="/qc/management-review" title="Management Review" form="QC-MRV" purpose="Minutes, participants and resolutions" icon={<FileSearch size={18} />} />
          <FormCard href="/qc/internal-audit" title="Internal Audit" form="OF/MM/QC/51" purpose="Finding clearance and evaluation" icon={<FileSearch size={18} />} />
          <FormCard href="/qc/corrective-action" title="Corrective Action" form="QC-CAPLAN" purpose="Action plan with follow-up dates" icon={<FileSearch size={18} />} />
        </div>
      </section>

      <section>
        <h3>RELATED RECORDS</h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14 }}>
          <FormCard href="/qc/packaging" title="Packaging Inspection" form="OF/MM/QC/51" purpose="Finished pack appearance checks" count={formCounts.packaging} icon={<ClipboardCheck size={18} />} />
          <FormCard href="/qc/cip" title="CIP Records" form="QC-CIP" purpose="Cleaning cycle verification" icon={<ClipboardCheck size={18} />} />
          <FormCard href="/qc/retention-samples" title="Retention Samples" form="QC-RET" purpose="Retain until / disposal log" icon={<Beaker size={18} />} />
          <FormCard href="/qc/nonconformity" title="Nonconformity" form="QC-NCR" purpose="Quality nonconformity records" icon={<ShieldAlert size={18} />} />
          <FormCard href="/qc/hold-release" title="Product Hold / Release" form="QC-HLD" purpose="Standalone QC hold decision" icon={<ShieldAlert size={18} />} />
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 14 }}>
        <section style={cardStyle}>
          <strong>Open Nonconformities</strong>
          {openNonconformities.map((row) => (
            <Link key={row.id} href={`/qc/nonconformity/${row.id}`} style={{ display: "flex", justifyContent: "space-between", gap: 8, color: "inherit", textDecoration: "none" }}>
              <span>{row.ncNo} · {row.issueDescription}</span>
              <QCStatusBadge status={row.severity} />
            </Link>
          ))}
          {openNonconformities.length === 0 ? <span style={{ color: colors.text.muted }}>None open</span> : null}
        </section>
        <section style={cardStyle}>
          <strong>Active Product Holds</strong>
          {activeHolds.map((row) => (
            <Link key={row.id} href={`/qc/hold-release/${row.id}`} style={{ color: "inherit", textDecoration: "none" }}>{row.decisionNo} · {row.reason}</Link>
          ))}
          {activeHolds.length === 0 ? <span style={{ color: colors.text.muted }}>No active holds</span> : null}
        </section>
        <section style={cardStyle}>
          <strong>Pending QC Approvals</strong>
          {pendingApprovals.map((row) => (
            <Link key={row.id} href={`/qc/${row.slug}/${row.id}`} style={{ display: "flex", justifyContent: "space-between", color: "inherit", textDecoration: "none" }}>
              <span>{row.recordNo}</span>
              <QCStatusBadge status={row.status} />
            </Link>
          ))}
          {pendingApprovals.length === 0 ? <span style={{ color: colors.text.muted }}>None pending</span> : null}
        </section>
        <section style={cardStyle}>
          <strong>Recent Failed Tests</strong>
          {recentFailed.map((row) => (
            <Link key={row.id} href={`/qc/${row.slug}/${row.id}`} style={{ display: "flex", justifyContent: "space-between", color: "inherit", textDecoration: "none" }}>
              <span>{row.recordNo} · {row.formTitleSnapshot}</span>
              <QCResultBadge result={row.result} />
            </Link>
          ))}
          {recentFailed.length === 0 ? <span style={{ color: colors.text.muted }}>No failed tests</span> : null}
        </section>
      </div>
    </div>
  );
}

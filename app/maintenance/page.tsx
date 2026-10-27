import Link from "next/link";
import { ArrowRight, BarChart3, CalendarClock, ClipboardList, Package, Wrench } from "lucide-react";

import { MetricCard, PageHeader } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { requireAuth } from "@/lib/auth/auth";
import { getMaintenanceDashboardSummary } from "@/services/maintenance/maintenance-dashboard.service";
import { getModuleReportLinks } from "@/services/reports/report-access.service";

export const dynamic = "force-dynamic";

const links = [
  { title: "Asset Register", href: "/assets", icon: <Package size={18} />, description: "Manage live assets, ownership, and maintenance status." },
  { title: "Maintenance Tickets", href: "/maintenance/tickets", icon: <Wrench size={18} />, description: "Track incoming breakdown, corrective, and emergency requests." },
  { title: "Work Orders", href: "/maintenance/work-orders", icon: <ClipboardList size={18} />, description: "Execute labor, spare parts, and external maintenance work." },
  { title: "PM Schedule", href: "/maintenance/pm", icon: <CalendarClock size={18} />, description: "Plan and monitor preventive maintenance calendars and due work." },
];

export default async function MaintenanceRoutePage() {
  const user = await requireAuth();
  const summary = await getMaintenanceDashboardSummary({ accessibleLocationIds: user.accessibleLocationIds });
  const reportLinks = getModuleReportLinks("maintenance");

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24, padding: 24, background: "#f8fafc" }}>
      <PageHeader title="Maintenance" subtitle="Assets, tickets, work orders, and preventive maintenance" />

      <div style={{ background: "linear-gradient(135deg, rgba(15,139,141,0.1), rgba(15,139,141,0.03))", border: `1px solid ${colors.border}`, borderRadius: 18, padding: 24 }}>
        <p style={{ margin: 0, color: colors.text.secondary, lineHeight: "24px" }}>
          Maintenance is now tied to real assets, spare issue/return through inventory, and finance posting for work-order cost. This dashboard uses the scoped report services, so operational counts and cost visibility follow the same location access rules as the detail reports.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16 }}>
        <MetricCard label="Assets" value={summary.assetCount} subtitle={`${summary.underMaintenanceCount} under maintenance`} />
        <MetricCard label="Open Tickets" value={summary.openTicketCount} subtitle="Live corrective queue" />
        <MetricCard label="Active Work Orders" value={summary.activeWorkOrderCount} subtitle="Approved, assigned, or in progress" />
        <MetricCard label="PM Due" value={summary.pmDueCount} subtitle={`${summary.pmOverdueCount} overdue`} />
        <MetricCard label="Maintenance Cost" value={`ETB ${summary.maintenanceCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} subtitle="Total scoped work-order cost" />
        <MetricCard label="Downtime Minutes" value={summary.downtimeMinutes} subtitle={`Spare usage cost ETB ${summary.spareUsageCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`} />
        <MetricCard label="Machines Down" value={summary.machinesDownCount} subtitle="Under maintenance or out of service" />
        <MetricCard label="MTTR" value={`${summary.mttrHours.toFixed(2)} h`} subtitle="Mean time to repair" />
        <MetricCard label="MTBF" value={`${summary.mtbfHours.toFixed(2)} h`} subtitle="Mean time between failures" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              padding: 20,
              borderRadius: 16,
              border: `1px solid ${colors.border}`,
              background: "#fff",
              textDecoration: "none",
              color: colors.text.primary,
            }}
          >
            <div style={{ width: 40, height: 40, borderRadius: 12, background: colors.primary[50], color: colors.primary[700], display: "flex", alignItems: "center", justifyContent: "center" }}>
              {link.icon}
            </div>
            <div style={{ fontWeight: 700 }}>{link.title}</div>
            <div style={{ color: colors.text.secondary, fontSize: 14, lineHeight: "20px" }}>{link.description}</div>
          </Link>
        ))}
      </div>

      <section style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 16, padding: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 19 }}>Maintenance Reports</div>
            <div style={{ color: colors.text.secondary, marginTop: 4 }}>Open scoped operational reports here without adding report children to the sidebar.</div>
          </div>
          <Link href="/reports#maintenance" style={{ color: colors.primary[700], textDecoration: "none", fontWeight: 700, display: "inline-flex", gap: 8, alignItems: "center" }}><BarChart3 size={17} /> All Reports</Link>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10 }}>
          {reportLinks.map((report) => (
            <Link key={report.href} href={report.href} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "12px 14px", border: `1px solid ${colors.border}`, borderRadius: 12, color: colors.text.primary, textDecoration: "none" }}>
              <span>{report.title}</span><ArrowRight size={16} color={colors.primary[700]} />
            </Link>
          ))}
        </div>
      </section>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", background: colors.primary[700], color: "#fff", fontWeight: 700 }}>Recent Work Orders</div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            {summary.recentWorkOrders.length === 0 ? (
              <div style={{ color: colors.text.secondary }}>No visible work orders yet.</div>
            ) : summary.recentWorkOrders.map((order) => (
              <Link key={order.id} href={`/maintenance/work-orders/${order.id}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, textDecoration: "none", color: colors.text.primary, borderBottom: `1px solid ${colors.border}`, paddingBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{order.workOrderNo}</div>
                  <div style={{ color: colors.text.secondary, fontSize: 14 }}>{order.assetCode ?? "No asset code"} - {order.assetName ?? "Unknown asset"}</div>
                  <div style={{ color: colors.text.secondary, fontSize: 13 }}>{order.status} • {order.priority}</div>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </div>

        <div style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 16, overflow: "hidden" }}>
          <div style={{ padding: "16px 18px", background: colors.primary[700], color: "#fff", fontWeight: 700 }}>Recent Open Tickets</div>
          <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
            {summary.recentTickets.length === 0 ? (
              <div style={{ color: colors.text.secondary }}>No visible open tickets yet.</div>
            ) : summary.recentTickets.map((ticket) => (
              <Link key={ticket.id} href={`/maintenance/tickets/${ticket.id}`} style={{ display: "flex", justifyContent: "space-between", gap: 12, textDecoration: "none", color: colors.text.primary, borderBottom: `1px solid ${colors.border}`, paddingBottom: 12 }}>
                <div>
                  <div style={{ fontWeight: 700 }}>{ticket.ticketNo}</div>
                  <div style={{ color: colors.text.secondary, fontSize: 14 }}>{ticket.assetCode ?? "No asset code"} - {ticket.assetName ?? "Unknown asset"}</div>
                  <div style={{ color: colors.text.secondary, fontSize: 13 }}>{ticket.status} • {ticket.priority}</div>
                </div>
                <ArrowRight size={16} />
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
        {[
          { title: "Machines Down", empty: "No machines currently down.", items: summary.machinesDown.map((asset) => ({ href: `/assets/${asset.id}`, title: asset.assetCode, subtitle: `${asset.assetName} • ${asset.status}` })) },
          { title: "Critical Work Orders", empty: "No high-priority open work orders.", items: summary.criticalWorkOrders.map((order) => ({ href: `/maintenance/work-orders/${order.id}`, title: order.workOrderNo, subtitle: `${order.assetCode ?? "Asset"} • ${order.priority}` })) },
          { title: "Overdue Work Orders", empty: "No overdue work orders.", items: summary.overdueWorkOrders.map((order) => ({ href: `/maintenance/work-orders/${order.id}`, title: order.workOrderNo, subtitle: `${order.assetCode ?? "Asset"} • ${order.status}` })) },
          { title: "PM Due Soon", empty: "No preventive work due in the next 7 days.", items: summary.pmDueSoon.map((plan) => ({ href: `/maintenance/pm/${plan.id}`, title: plan.planNo, subtitle: `${plan.assetCode ?? "Asset"} • ${plan.nextDueDate ? new Date(plan.nextDueDate).toLocaleDateString() : "No due date"}` })) },
          { title: "Today's Downtime", empty: "No downtime recorded today.", items: summary.todaysDowntime.map((row) => ({ href: row.ticketId ? `/maintenance/tickets/${row.ticketId}` : "/production/downtime", title: row.ticketNo ?? row.machine ?? "Downtime", subtitle: `${row.assetCode ?? "Machine"} • ${row.durationMinutes} min` })) },
          { title: "Highest Cost Assets", empty: "No maintenance cost recorded.", items: summary.highestCostAssets.map((asset) => ({ href: `/assets/${asset.assetId}`, title: asset.assetCode ?? "Asset", subtitle: `${asset.assetName ?? ""} • ETB ${asset.totalCost.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` })) },
          { title: "Highest Downtime Assets", empty: "No downtime recorded.", items: summary.highestDowntimeAssets.map((asset) => ({ href: `/assets/${asset.assetId}`, title: asset.assetCode ?? "Asset", subtitle: `${asset.assetName ?? ""} • ${asset.downtimeMinutes} min` })) },
        ].map((section) => (
          <div key={section.title} style={{ background: "#fff", border: `1px solid ${colors.border}`, borderRadius: 16, overflow: "hidden" }}>
            <div style={{ padding: "16px 18px", background: colors.primary[700], color: "#fff", fontWeight: 700 }}>{section.title}</div>
            <div style={{ padding: 18, display: "flex", flexDirection: "column", gap: 14 }}>
              {section.items.length === 0 ? (
                <div style={{ color: colors.text.secondary }}>{section.empty}</div>
              ) : section.items.map((item) => (
                <Link key={`${section.title}-${item.href}-${item.title}`} href={item.href} style={{ display: "flex", justifyContent: "space-between", gap: 12, textDecoration: "none", color: colors.text.primary, borderBottom: `1px solid ${colors.border}`, paddingBottom: 12 }}>
                  <div>
                    <div style={{ fontWeight: 700 }}>{item.title}</div>
                    <div style={{ color: colors.text.secondary, fontSize: 14 }}>{item.subtitle}</div>
                  </div>
                  <ArrowRight size={16} />
                </Link>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

import Link from "next/link";

import { colors } from "@/components/ui/colors";

const reports = [
  { title: "Daily Report", href: "/production/reports/daily" },
  { title: "Efficiency Report", href: "/production/reports/efficiency" },
  { title: "Downtime Report", href: "/production/reports/downtime" },
  { title: "Cost Reports (Batch)", href: "/production/reports/batch-cost" },
  { title: "Cost Report (Main Factory)", href: "/production/reports/factory-cost" },
];

export default function ProductionReportsPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <header>
        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 600 }}>Production Reports</h1>
        <p style={{ margin: "6px 0 0", fontSize: 14, color: colors.text.secondary }}>Reports read posted shift, batch, downtime, and cost records. Missing consumption is not treated as zero.</p>
      </header>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
        {reports.map((report) => (
          <Link key={report.href} href={report.href} style={{ background: "white", border: `1px solid ${colors.border}`, borderRadius: 12, padding: 20, color: colors.primary[700], fontWeight: 600, textDecoration: "none" }}>
            {report.title}
          </Link>
        ))}
      </div>
    </div>
  );
}

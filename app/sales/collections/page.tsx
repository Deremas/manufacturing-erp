import Link from "next/link";

import { FormCard, PageHeader } from "@/components/shared";
import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { listCollectionFollowUps, listOverdueCustomers } from "@/services/sales/collections.service";

export const dynamic = "force-dynamic";

export default async function CollectionsDashboardPage() {
  const user = await requireAuth();
  const [overdue, followUps, preferences] = await Promise.all([
    listOverdueCustomers({ accessibleLocationIds: user.accessibleLocationIds }),
    listCollectionFollowUps({ accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);
  const overdueValue = overdue.reduce((sum, row) => sum + Number(row.overdueBalance || 0), 0);
  const today = new Date().toISOString().slice(0, 10);
  const promisesDue = followUps.filter((row) => row.promisedPaymentDate?.slice(0, 10) === today && row.status !== "CLOSED").length;
  const overdueFollowUps = followUps.filter((row) => row.followUpDate.slice(0, 10) < today && !["CLOSED", "CANCELLED"].includes(row.status)).length;
  const cards = [
    ["Overdue Customers", overdue.length],
    [`Outstanding (${preferences.currencyCode})`, overdueValue.toLocaleString("en-ET", { minimumFractionDigits: 2 })],
    ["Promises Due Today", promisesDue],
    ["Overdue Follow-ups", overdueFollowUps],
  ];
  return <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 24, background: "#f8fafc" }}>
    <PageHeader title="Collections" subtitle="Customer receivables, promises, assignments, and overdue recovery work" breadcrumbs={[{ label: "Sales", href: "/sales" }, { label: "Collections" }]} />
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 16 }}>{cards.map(([label, value]) => <FormCard key={String(label)} title={String(label)}><strong style={{ fontSize: 28 }}>{value}</strong></FormCard>)}</div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
      <FormCard title="Overdue Worklist" variant="teal-header"><p>Review overdue customers and invoice exposure by assigned location.</p><Link href="/sales/collections/overdue">Open overdue customers</Link></FormCard>
      <FormCard title="Follow-up Register" variant="teal-header"><p>Create, edit, reassign, escalate, and close collection follow-ups.</p><Link href="/sales/collections/follow-ups">Open follow-ups</Link></FormCard>
    </div>
  </div>;
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { sql } from "@/lib/db";
import { PageHeader } from "@/components/shared";
import { HoldDispositionPanel } from "@/features/qc/hold-disposition-panel";
import { getHoldReleaseById } from "@/services/qc/hold-release.service";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId: id } = await params;
  const [hold, locations] = await Promise.all([
    getHoldReleaseById(id),
    sql<Array<{ id: string; code: string; name: string }>>`SELECT id, "locationCode" AS code, "locationName" AS name FROM "Location" WHERE "isStockLocation" = true AND "isActive" = true AND "isArchived" = false ORDER BY "locationName"`,
  ]);
  if (!hold) notFound();
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        recordKind="qc.record"
        title={hold.holdNo}
        subtitle="Quarantine quantity control and auditable partial disposition."
        breadcrumbs={[{ label: "QC", href: "/qc" }, { label: "Inventory Holds", href: "/qc/inventory-holds" }, { label: hold.holdNo }]}
        actions={<Link href={`/qc/hold/print/${hold.publicId}`} style={{ padding: "10px 14px", borderRadius: 10, background: "#00897b", color: "white", textDecoration: "none" }}>Release Certificate</Link>}
      />
      <section style={{ background: "white", borderRadius: 16, padding: 22, display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 14 }}>
        {[["Batch", hold.batchNo], ["Category", hold.holdCategory.replace(/_/g, " ")], ["Item", hold.itemName], ["Location", hold.locationName], ["Held", hold.quantity], ["Remaining", hold.remainingQty], ["Released", hold.releasedQty], ["Reworked / Reused", hold.reworkedQty], ["Scrapped", hold.scrappedQty], ["Rejected", hold.rejectedQty], ["Status", hold.status]].map(([label, value]) => (
          <div key={String(label)}>
            <small style={{ color: "#64748b" }}>{label}</small>
            <div style={{ fontWeight: 700, marginTop: 4 }}>{String(value ?? "-")}</div>
          </div>
        ))}
      </section>
      <section style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 14, padding: 16 }}>
        <b>Disposition purpose</b>
        <p style={{ marginBottom: 0 }}>{hold.holdReason}</p>
      </section>
      <HoldDispositionPanel holdId={hold.id} remainingQty={hold.remainingQty} locations={locations.filter((row) => row.id !== hold.locationId)} />
      <section style={{ background: "white", borderRadius: 16, padding: 22 }}>
        <h2 style={{ marginTop: 0 }}>Disposition History</h2>
        {hold.dispositions.map((row) => (
          <div key={row.id} style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(120px,1fr))", gap: 10, padding: "12px 0", borderTop: "1px solid #e2e8f0" }}>
            <span>{row.dispositionNo}</span>
            <b>{row.dispositionType}</b>
            <span>{row.quantity}</span>
            <span>{row.unitCost.toFixed(2)} / unit</span>
            <span>{row.totalCost.toFixed(2)} total</span>
            <span>{row.journalEntryId ? "Journal posted" : "No journal required"}</span>
            <span>{row.reason}</span>
            <span>{new Date(row.performedAt).toLocaleString()}</span>
          </div>
        ))}
      </section>
    </div>
  );
}

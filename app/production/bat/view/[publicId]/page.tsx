import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/shared";
import { BatchStageControls } from "@/features/production/batch-stage-controls";
import { publicPrintUrl } from "@/lib/routing";
import { getProductionBatchTraceability } from "@/services/production/production-batch.service";

export const dynamic = "force-dynamic";
const card = { background: "white", border: "1px solid #e2e8f0", borderRadius: 16, padding: 22 } as const;
function Records({ title, rows }: { title: string; rows: Array<Record<string, unknown>> }) {
  const keys = rows[0] ? Object.keys(rows[0]).filter((key) => key !== "id") : [];
  return (
    <section style={card}>
      <h2 style={{ marginTop: 0 }}>{title}</h2>
      {rows.length === 0 ? (
        <p style={{ color: "#64748b" }}>No records.</p>
      ) : (
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", minWidth: 760, width: "100%" }}>
            <thead>
              <tr>{keys.map((key) => <th key={key} style={{ textAlign: "left", padding: 10, background: "#f8fafc" }}>{key.replace(/([A-Z])/g, " $1")}</th>)}</tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={String(row.id)}>
                  {keys.map((key) => <td key={key} style={{ padding: 10, borderTop: "1px solid #e2e8f0" }}>{String(row[key] ?? "-")}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default async function Page({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const batch = await getProductionBatchTraceability(publicId);
  if (!batch) notFound();
  return (
    <div style={{ display: "grid", gap: 20 }}>
      <PageHeader
        recordKind="production"
        title={`${batch.batchNo} - ${batch.finishedGoodName}`}
        subtitle="End-to-end production, quality, inventory, maintenance, and cost traceability."
        breadcrumbs={[{ label: "Production", href: "/production" }, { label: "Batches", href: "/production/batches" }, { label: batch.batchNo }]}
        actions={
          <div style={{ display: "flex", gap: 10 }}>
            <Link href={`/api/production/batches/${batch.id}/traceability.csv`} style={{ padding: "10px 14px", border: "1px solid #00897b", color: "#00695c", borderRadius: 10, textDecoration: "none" }}>Export CSV</Link>
            <Link href={publicPrintUrl("production.batch", batch.publicId)} style={{ padding: "10px 14px", background: "#00897b", color: "white", borderRadius: 10, textDecoration: "none" }}>Print Traceability</Link>
          </div>
        }
      />
      <section style={card}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(170px,1fr))", gap: 15 }}>
          {[["Status", batch.status], ["Produced", batch.producedQty], ["Accepted", batch.acceptedQty], ["Rejected", batch.rejectedQty], ["Wastage", batch.wastageQty], ["Machine", batch.machineName], ["Location", batch.locationName], ["Total Cost", batch.costRecord?.totalCost ?? 0]].map(([label, value]) => (
            <div key={String(label)}>
              <small style={{ color: "#64748b" }}>{label}</small>
              <div style={{ fontSize: 19, fontWeight: 700, marginTop: 4 }}>{String(value ?? "-")}</div>
            </div>
          ))}
        </div>
      </section>
      <BatchStageControls batchId={batch.id} stages={batch.availableStages} machines={batch.machines} executions={batch.stages} />
      <Records title="Production Stage Timeline" rows={batch.timeline} />
      <Records title="Linked Rework Batches" rows={batch.reworkBatches} />
      <Records title="Stage History" rows={batch.stages} />
      <Records title="Material Issues" rows={batch.issues} />
      <Records title="Consumed Material Lots and Serials" rows={batch.materialLots} />
      <Records title="Material Returns" rows={batch.returns} />
      <Records title="QC Tasks and Results" rows={batch.tasks} />
      <Records title="Holds and Dispositions" rows={batch.holds} />
      <Records title="Nonconformities" rows={batch.nonconformities} />
      <Records title="Inventory Movements" rows={batch.movements} />
      <Records title="Downtime and Maintenance" rows={batch.downtimes} />
    </div>
  );
}

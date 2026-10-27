import { notFound } from "next/navigation";
import { getProductionBatchTraceability } from "@/services/production/production-batch.service";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const batch = await getProductionBatchTraceability(publicId);
  if (!batch) notFound();
  return (
    <main className="print-content" style={{ padding: 28, color: "#0f172a" }}>
      <h1>Production Batch Traceability</h1>
      <h2>{batch.batchNo} - {batch.finishedGoodName}</h2>
      <p>Status: {batch.status} | Produced: {batch.producedQty} | Accepted: {batch.acceptedQty}</p>
      {[["Stages", batch.stages], ["QC Tasks", batch.tasks], ["Holds", batch.holds], ["Nonconformities", batch.nonconformities], ["Inventory Movements", batch.movements], ["Downtime / Maintenance", batch.downtimes]].map(([title, rows]) => (
        <section key={String(title)} style={{ marginTop: 24, breakInside: "avoid" }}>
          <h3>{String(title)}</h3>
          <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit", fontSize: 11 }}>{JSON.stringify(rows, null, 2)}</pre>
        </section>
      ))}
    </main>
  );
}

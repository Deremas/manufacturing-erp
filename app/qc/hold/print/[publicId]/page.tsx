import { notFound } from "next/navigation";
import { getHoldReleaseById } from "@/services/qc/hold-release.service";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId: id } = await params;
  const hold = await getHoldReleaseById(id);
  if (!hold) notFound();
  return (
    <main className="print-content" style={{ padding: 32 }}>
      <h1>QC Release / Disposition Certificate</h1>
      <h2>{hold.holdNo}</h2>
      <p>Batch: {hold.batchNo ?? "-"}</p>
      <p>Category: {hold.holdCategory.replace(/_/g, " ")}</p>
      <p>Purpose: {hold.holdReason}</p>
      <p>Item: {hold.itemName}</p>
      <p>Original held quantity: {hold.quantity}</p>
      <p>Released: {hold.releasedQty} | Reworked / Reused: {hold.reworkedQty} | Scrapped: {hold.scrappedQty} | Rejected: {hold.rejectedQty}</p>
      <p>Status: {hold.status}</p>
    </main>
  );
}

import BatchesListPage from "@/features/production/batches/BatchesListPage";
import { listProductionBatches } from "@/services/production/production-batch.service";

export const dynamic = "force-dynamic";

export default async function ProductionBatchesPage() {
  const batches = await listProductionBatches();

  return (
    <BatchesListPage
      rows={batches.map((batch) => ({
        id: batch.id,
        publicId: batch.publicId,
        batchNo: batch.batchNo,
        sessionPublicId: batch.sessionPublicId,
        sessionNo: batch.sessionNo,
        shiftCode: batch.shiftCode,
        productionDate: batch.productionDate,
        locationName: batch.locationName,
        finishedGoodCode: batch.finishedGoodCode,
        finishedGoodName: batch.finishedGoodName,
        producedQty: Number(batch.producedQty ?? 0),
        acceptedQty: Number(batch.acceptedQty ?? 0),
        rejectedQty: Number(batch.rejectedQty ?? 0),
        wastageQty: Number(batch.wastageQty ?? 0),
        status: batch.status,
        machineName: batch.machineName,
      }))}
    />
  );
}

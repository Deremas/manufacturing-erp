import { getQcReferenceData } from "@/app/qc/_lib/reference-data";
import { WaterTestEditor } from "@/features/qc/document-pages";
import { getProductionBatchById } from "@/services/production/production-batch.service";
import { getQcTaskById } from "@/services/qc/qc-task.service";

export async function QcTaskTestCreatePage({ batchId, taskId, moduleLabel, returnHref }: {
  batchId?: string; taskId?: string; moduleLabel: string; returnHref: string;
}) {
  const [referenceData, batch, task] = await Promise.all([
    getQcReferenceData(),
    batchId ? getProductionBatchById(batchId) : Promise.resolve(null),
    taskId ? getQcTaskById(taskId) : Promise.resolve(null),
  ]);
  return <WaterTestEditor items={referenceData.items} locations={referenceData.locations} users={referenceData.users}
    batches={referenceData.batches} samplePoints={referenceData.qcOptions.waterSamplePoints}
    initialTestedById={referenceData.currentUser?.id ?? ""} task={task ?? undefined} moduleLabel={moduleLabel} returnHref={returnHref}
    initialValue={task ? { productionBatchId: task.productionBatchId ?? undefined, itemId: task.itemId ?? undefined,
      locationId: task.locationId ?? undefined, remarks: `QC task ${task.taskNo} for ${task.batchNo ?? task.itemCode ?? "production output"}` }
      : batch ? { productionBatchId: batch.id, itemId: batch.finishedGoodId, locationId: batch.locationId,
        remarks: `QC handoff from production batch ${batch.batchNo}` } : undefined} />;
}

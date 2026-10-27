import { DowntimeEditor } from "@/features/shift/document-pages";
import { getAssets } from "@/services/maintenance/maintenance.service";
import { loadShift, shiftPublicPath } from "@/app/production/shift-sessions/[id]/_lib/load-session";

export default async function ShiftDowntimeRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await loadShift(id, "/downtime/create");
  const assets = await getAssets();

  return (
    <DowntimeEditor
      sessionNo={session.sessionNo}
      apiBasePath={`/api/shifts/sessions/${session.id}/downtime`}
      cancelHref={shiftPublicPath(session.publicId)}
      assets={assets.filter((asset) => asset.isProductionAsset && asset.locationId === session.locationId && asset.isActive && ["ACTIVE", "ASSIGNED", "IN_USE"].includes(asset.status))}
      batches={session.batches.map((batch) => ({ id: batch.id, batchNo: batch.batchNo, status: batch.status }))}
    />
  );
}

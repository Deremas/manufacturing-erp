import DailyProductionReportPage from "@/features/production/shift-sessions/DailyProductionReportPage";
import { listBoms } from "@/services/production/bom.service";
import { listFinishedGoods } from "@/services/production/production-shared.service";
import { loadShift, shiftPublicPath } from "@/app/production/shift-sessions/[id]/_lib/load-session";

export const dynamic = "force-dynamic";

export default async function ShiftProductionReportRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await loadShift(id, "/daily-report");
  const [finishedGoods, boms] = await Promise.all([
    listFinishedGoods(),
    listBoms(),
  ]);

  return (
    <DailyProductionReportPage
      sessionNo={session.sessionNo}
      sessionPath={shiftPublicPath(session.publicId)}
      productionDate={session.productionDate}
      shiftCode={session.shiftCode}
      factoryLocationId={session.locationId}
      factoryLocationName={session.locationName}
      outputApiPath={`/api/shifts/sessions/${session.id}/output`}
      finishedGoods={finishedGoods.map((item) => ({ value: item.value, label: item.label }))}
      boms={boms.filter((bom) => bom.status === "ACTIVE").map((bom) => ({
        value: bom.id,
        label: `${bom.bomNo} - ${bom.bomName}`,
        finishedGoodId: bom.finishedGoodId,
        outputQty: Number(bom.outputQty ?? 0),
      }))}
    />
  );
}

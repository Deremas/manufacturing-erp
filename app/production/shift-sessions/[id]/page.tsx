import ShiftWorkspacePage from "@/features/production/shift-sessions/ShiftWorkspacePage";
import { loadShift } from "@/app/production/shift-sessions/[id]/_lib/load-session";
import { getShiftMaterialCoverage } from "@/services/production/shift-coverage.service";
import { getShiftDefinitions } from "@/services/production/production-shared.service";

export const dynamic = "force-dynamic";

export default async function ShiftWorkspaceRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await loadShift(id);
  const [coverage, shifts] = await Promise.all([
    getShiftMaterialCoverage(session.id, session.locationId),
    getShiftDefinitions(),
  ]);
  const shiftName = shifts.find((row) => row.code === session.shiftCode)?.name ?? "";

  return (
    <ShiftWorkspacePage
      session={{
        id: session.id,
        publicId: session.publicId,
        sessionNo: session.sessionNo,
        productionDate: session.productionDate,
        shiftCode: session.shiftCode,
        shiftName,
        locationName: session.locationName,
        status: session.status,
        startedByName: session.startedByName,
        startedAt: session.startedAt,
        endedAt: session.endedAt,
        attendance: session.attendance.map((row) => ({ userName: row.userName, role: row.role, remarks: row.remarks })),
        issues: session.issues.map((row) => ({ issueNo: row.issueNo, status: row.status, itemCount: row.itemCount, issuedQty: Number(row.issuedQty ?? 0) })),
        coverage: coverage.map((row) => ({
          productCode: row.productCode,
          productName: row.productName,
          materialCode: row.materialCode,
          materialName: row.materialName,
          uom: row.uom,
          totalRequired: row.totalRequired,
          wipAvailable: row.wipAvailable,
          shortage: row.shortage,
          status: row.status,
        })),
        returns: session.returns.map((row) => ({ returnNo: row.returnNo, status: row.status, itemCount: row.itemCount })),
        batches: session.batches.map((row) => ({
          publicId: row.publicId,
          batchNo: row.batchNo,
          status: row.status,
          producedQty: Number(row.producedQty ?? 0),
          acceptedQty: Number(row.acceptedQty ?? 0),
          rejectedQty: Number(row.rejectedQty ?? 0),
          wastageQty: Number(row.wastageQty ?? 0),
          finishedGoodCode: row.finishedGoodCode,
          finishedGoodName: row.finishedGoodName,
          machineName: row.machineName,
        })),
        downtimes: session.downtimes.map((row) => ({
          reason: row.reason,
          durationMinutes: Number(row.durationMinutes ?? 0),
          machine: row.machine,
          status: row.status,
          maintenanceTicketNo: row.maintenanceTicketNo,
        })),
        qcTests: session.qcTests.map((row) => ({ testNo: row.testNo, result: row.result, status: row.status })),
      }}
    />
  );
}

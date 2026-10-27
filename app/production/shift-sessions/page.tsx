import ShiftSessionsListPage from "@/features/production/shift-sessions/ShiftSessionsListPage";
import { listShiftSessions } from "@/services/shift/shift-session.service";

export const dynamic = "force-dynamic";

export default async function ProductionShiftSessionsPage() {
  const rows = await listShiftSessions();
  return (
    <ShiftSessionsListPage
      rows={rows.map((row) => ({
        id: row.id,
        publicId: row.publicId,
        sessionNo: row.sessionNo,
        productionDate: row.productionDate,
        shiftCode: row.shiftCode,
        locationName: row.locationName,
        status: row.status,
        startedByName: row.startedByName,
        employeeCount: Number(row.employeeCount ?? 0),
      }))}
    />
  );
}

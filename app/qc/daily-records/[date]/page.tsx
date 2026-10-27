import { getCurrentUser } from "@/lib/auth/auth";
import { QCDailyRecordsPage } from "@/features/qc/components/QCDailyRecordsPage";
import { getShiftDefinitions } from "@/services/production/production-shared.service";
import { listDailyQcRecords } from "@/services/qc/qc-record.service";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const user = await getCurrentUser();
  const [rows, shifts] = await Promise.all([
    listDailyQcRecords({ date }, { accessibleLocationIds: user?.accessibleLocationIds }),
    getShiftDefinitions(),
  ]);
  return <QCDailyRecordsPage date={date} rows={rows} shifts={shifts.map((shift) => ({ value: shift.code, label: shift.name }))} />;
}

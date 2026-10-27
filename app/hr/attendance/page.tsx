import { requireAuth } from "@/lib/auth/auth";
import AttendanceListPage from "@/features/hr/AttendanceListPage";
import { getAttendanceReferenceData, listDailyAttendance } from "@/services/hr/attendance.service";

export default async function HrAttendanceRoute({
  searchParams,
}: {
  searchParams?: Promise<{ employeeId?: string }>;
}) {
  const user = await requireAuth();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedEmployeeId = resolvedSearchParams?.employeeId?.trim() || undefined;
  const [rows, referenceData] = await Promise.all([
    listDailyAttendance({
      accessibleLocationIds: user.accessibleLocationIds,
      employeeId: selectedEmployeeId,
    }),
    getAttendanceReferenceData({
      accessibleLocationIds: user.accessibleLocationIds,
    }),
  ]);

  return <AttendanceListPage rows={rows} selectedEmployeeId={selectedEmployeeId} {...referenceData} />;
}

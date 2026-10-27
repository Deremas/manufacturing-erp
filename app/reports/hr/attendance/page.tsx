import { requireAuth } from "@/lib/auth/auth";
import HrAttendanceReportPage from "@/features/reports/HrAttendanceReportPage";
import { getHrAttendanceReport, getHrReportReferenceData } from "@/services/reports/hr-report.service";
import { parseCommonReportFilters, normalizeReportQueryValue } from "@/services/reports/report-filter.service";

export default async function HrAttendanceReportRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = {
    ...parseCommonReportFilters(resolvedSearchParams),
    employeeId: normalizeReportQueryValue(resolvedSearchParams.employeeId),
    sourceType: normalizeReportQueryValue(resolvedSearchParams.sourceType),
  };
  const [rows, referenceData] = await Promise.all([
    getHrAttendanceReport({
      accessibleLocationIds: user.accessibleLocationIds,
    }, filters),
    getHrReportReferenceData({
      accessibleLocationIds: user.accessibleLocationIds,
    }),
  ]);

  return (
    <HrAttendanceReportPage
      rows={rows}
      employees={referenceData.employees}
      locations={referenceData.locations}
      refreshedAt={new Date().toLocaleString("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
      })}
    />
  );
}

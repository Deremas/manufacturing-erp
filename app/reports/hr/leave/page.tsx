import { requireAuth } from "@/lib/auth/auth";
import HrLeaveReportPage from "@/features/reports/HrLeaveReportPage";
import { getHrLeaveReport, getHrReportReferenceData } from "@/services/reports/hr-report.service";
import { parseCommonReportFilters, normalizeReportQueryValue } from "@/services/reports/report-filter.service";

export default async function HrLeaveReportRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = {
    ...parseCommonReportFilters(resolvedSearchParams),
    employeeId: normalizeReportQueryValue(resolvedSearchParams.employeeId),
    leaveTypeId: normalizeReportQueryValue(resolvedSearchParams.leaveTypeId),
  };
  const [rows, referenceData] = await Promise.all([
    getHrLeaveReport({
      accessibleLocationIds: user.accessibleLocationIds,
    }, filters),
    getHrReportReferenceData({
      accessibleLocationIds: user.accessibleLocationIds,
    }),
  ]);

  return (
    <HrLeaveReportPage
      rows={rows}
      employees={referenceData.employees}
      locations={referenceData.locations}
      leaveTypes={referenceData.leaveTypes}
      refreshedAt={new Date().toLocaleString("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
      })}
    />
  );
}

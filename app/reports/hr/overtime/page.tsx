import { requireAuth } from "@/lib/auth/auth";
import HrOvertimeReportPage from "@/features/reports/HrOvertimeReportPage";
import { getHrOvertimeReport, getHrReportReferenceData } from "@/services/reports/hr-report.service";
import { parseCommonReportFilters, normalizeReportQueryValue } from "@/services/reports/report-filter.service";

export default async function HrOvertimeReportRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = {
    ...parseCommonReportFilters(resolvedSearchParams),
    employeeId: normalizeReportQueryValue(resolvedSearchParams.employeeId),
  };
  const [rows, referenceData] = await Promise.all([
    getHrOvertimeReport({
      accessibleLocationIds: user.accessibleLocationIds,
    }, filters),
    getHrReportReferenceData({
      accessibleLocationIds: user.accessibleLocationIds,
    }),
  ]);

  return (
    <HrOvertimeReportPage
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

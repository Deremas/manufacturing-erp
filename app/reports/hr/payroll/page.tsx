import { requireAuth } from "@/lib/auth/auth";
import HrPayrollReportPage from "@/features/reports/HrPayrollReportPage";
import { getHrPayrollReport, getHrReportReferenceData } from "@/services/reports/hr-report.service";
import { parseCommonReportFilters } from "@/services/reports/report-filter.service";

export default async function HrPayrollReportRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const filters = parseCommonReportFilters(resolvedSearchParams);
  const [rows, referenceData] = await Promise.all([
    getHrPayrollReport({
      accessibleLocationIds: user.accessibleLocationIds,
    }, filters),
    getHrReportReferenceData({
      accessibleLocationIds: user.accessibleLocationIds,
    }),
  ]);

  return (
    <HrPayrollReportPage
      rows={rows}
      locations={referenceData.locations}
      refreshedAt={new Date().toLocaleString("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
      })}
    />
  );
}

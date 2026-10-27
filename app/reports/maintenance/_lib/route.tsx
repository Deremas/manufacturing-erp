import { requireAuth } from "@/lib/auth/auth";
import MaintenanceReportWorkspace from "@/features/reports/MaintenanceReportWorkspace";
import {
  getMaintenanceAssetCostReport,
  getMaintenanceAssetRegisterReport,
  getMaintenanceBreakdownsReport,
  getMaintenanceDepartmentCostReport,
  getMaintenanceDirectIssueReport,
  getMaintenanceDowntimeReport,
  getMaintenanceOpenTicketsReport,
  getMaintenanceOpenWorkOrdersReport,
  getMaintenanceOverdueWorkOrdersReport,
  getMaintenanceRepeatFailuresReport,
  getMaintenanceReportReferenceData,
  getMaintenanceSpareDamageReport,
  getMaintenanceSparePartsUsageReport,
  getMaintenanceWarrantyExpiryReport,
  getMaintenanceWorkOrdersReport,
  getPreventiveMaintenanceComplianceReport,
  getPreventiveMaintenanceReport,
} from "@/services/reports/maintenance-report.service";
import { normalizeReportQueryValue, parseCommonReportFilters } from "@/services/reports/report-filter.service";

type ReportKey =
  | "asset-register"
  | "work-orders"
  | "open-work-orders"
  | "overdue-work-orders"
  | "breakdowns"
  | "preventive-maintenance"
  | "pm-compliance"
  | "downtime"
  | "spare-parts-usage"
  | "spare-damage"
  | "direct-issues"
  | "asset-maintenance-cost"
  | "department-cost"
  | "warranty-expiry"
  | "repeat-failures"
  | "open-tickets";

const reportLoaders = {
  "asset-register": getMaintenanceAssetRegisterReport,
  "work-orders": getMaintenanceWorkOrdersReport,
  "open-work-orders": getMaintenanceOpenWorkOrdersReport,
  "overdue-work-orders": getMaintenanceOverdueWorkOrdersReport,
  breakdowns: getMaintenanceBreakdownsReport,
  "preventive-maintenance": getPreventiveMaintenanceReport,
  "pm-compliance": getPreventiveMaintenanceComplianceReport,
  downtime: getMaintenanceDowntimeReport,
  "spare-parts-usage": getMaintenanceSparePartsUsageReport,
  "spare-damage": getMaintenanceSpareDamageReport,
  "direct-issues": getMaintenanceDirectIssueReport,
  "asset-maintenance-cost": getMaintenanceAssetCostReport,
  "department-cost": getMaintenanceDepartmentCostReport,
  "warranty-expiry": getMaintenanceWarrantyExpiryReport,
  "repeat-failures": getMaintenanceRepeatFailuresReport,
  "open-tickets": getMaintenanceOpenTicketsReport,
} as const;

export async function renderMaintenanceReportRoute(
  reportKey: ReportKey,
  searchParams?: Promise<Record<string, string | string[] | undefined>>,
) {
  const user = await requireAuth();
  const resolvedSearchParams = searchParams ? await searchParams : {};
  const scope = { accessibleLocationIds: user.accessibleLocationIds };
  const filters = {
    ...parseCommonReportFilters(resolvedSearchParams),
    assetId: normalizeReportQueryValue(resolvedSearchParams.assetId),
  };

  const [rows, referenceData] = await Promise.all([
    reportLoaders[reportKey](scope, filters),
    getMaintenanceReportReferenceData(scope),
  ]);

  return (
    <MaintenanceReportWorkspace
      reportKey={reportKey}
      rows={rows}
      assets={referenceData.assets}
      locations={referenceData.locations}
      refreshedAt={new Date().toLocaleString("en-KE", {
        dateStyle: "medium",
        timeStyle: "short",
      })}
    />
  );
}

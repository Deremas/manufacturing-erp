import { renderMaintenanceReportRoute } from "@/app/reports/maintenance/_lib/route";

export default async function MaintenanceAssetMaintenanceCostReportRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderMaintenanceReportRoute("asset-maintenance-cost", searchParams);
}

import { renderMaintenanceReportRoute } from "@/app/reports/maintenance/_lib/route";

export default async function MaintenanceSparePartsUsageReportRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderMaintenanceReportRoute("spare-parts-usage", searchParams);
}

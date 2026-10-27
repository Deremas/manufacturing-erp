import { renderMaintenanceReportRoute } from "@/app/reports/maintenance/_lib/route";

export default async function MaintenancePreventiveMaintenanceReportRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderMaintenanceReportRoute("preventive-maintenance", searchParams);
}

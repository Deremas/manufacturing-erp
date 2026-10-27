import { renderMaintenanceReportRoute } from "@/app/reports/maintenance/_lib/route";

export default async function MaintenanceDowntimeReportRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderMaintenanceReportRoute("downtime", searchParams);
}

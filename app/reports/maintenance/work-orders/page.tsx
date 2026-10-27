import { renderMaintenanceReportRoute } from "@/app/reports/maintenance/_lib/route";

export default async function MaintenanceWorkOrdersReportRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  return renderMaintenanceReportRoute("work-orders", searchParams);
}

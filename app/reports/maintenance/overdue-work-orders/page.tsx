import { renderMaintenanceReportRoute } from "@/app/reports/maintenance/_lib/route";
export default function Page({ searchParams }: { searchParams?: Promise<Record<string, string | string[] | undefined>> }) {
  return renderMaintenanceReportRoute("overdue-work-orders", searchParams);
}

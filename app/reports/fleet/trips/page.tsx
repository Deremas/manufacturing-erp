import { requireAuth } from "@/lib/auth/auth";
import FleetTripReportPage from "@/features/reports/FleetTripReportPage";
import { getFleetTripReport } from "@/services/reports/fleet-report.service";

export const dynamic = "force-dynamic";

export default async function FleetTripsReportPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = (await searchParams) ?? {};
  const status = typeof params.status === "string" ? params.status : "";

  const report = await getFleetTripReport({
    accessibleLocationIds: user.accessibleLocationIds,
    status,
  });

  return (
    <FleetTripReportPage
      rows={report.rows}
      kpis={report.kpis}
      statusOptions={["PLANNED", "ASSIGNED", "LOADING", "DISPATCHED", "IN_TRANSIT", "ARRIVED", "COMPLETED", "CANCELLED"]}
      selectedStatus={status}
      refreshedAt={new Date().toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" })}
    />
  );
}

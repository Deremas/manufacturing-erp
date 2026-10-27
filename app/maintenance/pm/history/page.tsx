import { PreventiveMaintenanceHistoryPage } from "@/features/maintenance/WorkflowPages";
import { getPreventiveMaintenanceHistory } from "@/services/maintenance/maintenance.service";
import { requireAuth } from "@/lib/auth/auth";

export const dynamic = "force-dynamic";

export default async function PreventiveMaintenanceHistoryRoute() {
  const user = await requireAuth();
  const rows = await getPreventiveMaintenanceHistory();
  return <PreventiveMaintenanceHistoryPage rows={user.accessibleLocationIds?.length ? rows.filter((row) => user.accessibleLocationIds?.includes(row.locationId)) : rows} />;
}

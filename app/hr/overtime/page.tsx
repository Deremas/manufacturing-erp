import { requireAuth } from "@/lib/auth/auth";
import OvertimeRequestsListPage from "@/features/hr/OvertimeRequestsListPage";
import { listOvertimeRequests } from "@/services/hr/overtime.service";

export default async function HrOvertimeRoute() {
  const user = await requireAuth();
  const rows = await listOvertimeRequests({
    accessibleLocationIds: user.accessibleLocationIds,
  });

  return <OvertimeRequestsListPage rows={rows} />;
}

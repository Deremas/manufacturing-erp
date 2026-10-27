import { requireAuth } from "@/lib/auth/auth";
import LeaveRequestsListPage from "@/features/hr/LeaveRequestsListPage";
import { listLeaveRequests } from "@/services/hr/leave.service";

export default async function HrLeaveRoute() {
  const user = await requireAuth();
  const rows = await listLeaveRequests({
    accessibleLocationIds: user.accessibleLocationIds,
  });

  return <LeaveRequestsListPage rows={rows} />;
}

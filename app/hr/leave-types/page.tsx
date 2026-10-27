import LeaveTypesPage from "@/features/hr/LeaveTypesPage";
import { listLeaveTypes } from "@/services/hr/leave.service";

export const dynamic = "force-dynamic";

export default async function HrLeaveTypesRoute() {
  const initialItems = await listLeaveTypes();
  return <LeaveTypesPage initialItems={initialItems} />;
}

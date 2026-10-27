import { requireAuth } from "@/lib/auth/auth";
import LeaveRequestFormPage from "@/features/hr/LeaveRequestFormPage";
import { getLeaveReferenceData } from "@/services/hr/leave.service";

export default async function HrLeaveCreateRoute() {
  await requireAuth();
  const referenceData = await getLeaveReferenceData();

  return (
    <LeaveRequestFormPage
      employees={referenceData.employees}
      leaveTypes={referenceData.leaveTypes}
      submitEndpoint="/api/hr/leave"
      successHref="/hr/leave"
    />
  );
}

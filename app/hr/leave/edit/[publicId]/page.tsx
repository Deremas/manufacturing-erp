import { notFound } from "next/navigation";

import LeaveRequestFormPage from "@/features/hr/LeaveRequestFormPage";
import { requireAuth } from "@/lib/auth/auth";
import { publicViewUrl } from "@/lib/routing/urls";
import { getLeaveReferenceData, getLeaveRequestById } from "@/services/hr/leave.service";

export default async function HrLeaveEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await requireAuth();
  const { publicId } = await params;
  const [request, referenceData] = await Promise.all([
    getLeaveRequestById(publicId),
    getLeaveReferenceData(),
  ]);
  if (!request) notFound();

  return (
    <LeaveRequestFormPage
      initialData={request}
      employees={referenceData.employees}
      leaveTypes={referenceData.leaveTypes}
      submitEndpoint={`/api/hr/leave/${request.id}`}
      successHref={publicViewUrl("hr.leave", request.publicId)}
      isEdit
    />
  );
}

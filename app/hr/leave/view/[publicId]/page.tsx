import { notFound } from "next/navigation";

import LeaveRequestDetailPage from "@/features/hr/LeaveRequestDetailPage";
import { requireAuth } from "@/lib/auth/auth";
import { getLeaveRequestById } from "@/services/hr/leave.service";

export default async function HrLeaveViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await requireAuth();
  const { publicId } = await params;
  const request = await getLeaveRequestById(publicId);
  if (!request) notFound();
  return <LeaveRequestDetailPage request={request} />;
}

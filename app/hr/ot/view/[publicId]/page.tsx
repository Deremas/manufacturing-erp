import { notFound } from "next/navigation";

import OvertimeRequestDetailPage from "@/features/hr/OvertimeRequestDetailPage";
import { requireAuth } from "@/lib/auth/auth";
import { getOvertimeRequestById } from "@/services/hr/overtime.service";

export default async function HrOvertimeViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await requireAuth();
  const { publicId } = await params;
  const overtime = await getOvertimeRequestById(publicId);
  if (!overtime) notFound();
  return <OvertimeRequestDetailPage overtime={overtime} />;
}

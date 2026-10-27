import { notFound } from "next/navigation";

import OvertimeRequestFormPage from "@/features/hr/OvertimeRequestFormPage";
import { requireAuth } from "@/lib/auth/auth";
import { publicViewUrl } from "@/lib/routing/urls";
import { getOvertimeReferenceData, getOvertimeRequestById } from "@/services/hr/overtime.service";

export default async function HrOvertimeEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await requireAuth();
  const { publicId } = await params;
  const [referenceData, overtime] = await Promise.all([
    getOvertimeReferenceData(),
    getOvertimeRequestById(publicId),
  ]);
  if (!overtime) notFound();

  return (
    <OvertimeRequestFormPage
      initialData={overtime}
      employees={referenceData.employees}
      reasons={referenceData.reasons}
      shifts={referenceData.shifts}
      submitEndpoint={`/api/hr/overtime/${overtime.id}`}
      successHref={publicViewUrl("hr.overtime", overtime.publicId)}
      isEdit
    />
  );
}

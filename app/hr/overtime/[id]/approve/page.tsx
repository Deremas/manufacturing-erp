import { redirectLegacyToPublicUrl } from "@/lib/routing/legacy-redirect";

export default async function OvertimeApproveRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await redirectLegacyToPublicUrl("hr.overtime", id, "view");
}

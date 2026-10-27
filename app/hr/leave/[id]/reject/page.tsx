import { redirectLegacyToPublicUrl } from "@/lib/routing/legacy-redirect";

export default async function LeaveRejectRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await redirectLegacyToPublicUrl("hr.leave", id, "view");
}

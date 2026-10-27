import { redirectLegacyToPublicUrl } from "@/lib/routing/legacy-redirect";

export default async function LegacyRequisitionEditRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await redirectLegacyToPublicUrl("inventory.requisition", id, "edit");
}

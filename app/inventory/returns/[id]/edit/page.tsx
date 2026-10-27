import { redirectLegacyToPublicUrl } from "@/lib/routing/legacy-redirect";

export default async function LegacyReturnEditRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await redirectLegacyToPublicUrl("inventory.return", id, "edit");
}

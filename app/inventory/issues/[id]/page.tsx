import { redirectLegacyToPublicUrl } from "@/lib/routing/legacy-redirect";

export default async function LegacyIssueViewRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await redirectLegacyToPublicUrl("inventory.issue", id, "view");
}

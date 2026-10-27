import { redirectLegacyToPublicUrl } from "@/lib/routing/legacy-redirect";

export default async function LegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await redirectLegacyToPublicUrl("qc.sample", id, "view");
}

import { notFound } from "next/navigation";

import { redirectLegacyToPublicUrl } from "@/lib/routing/legacy-redirect";
import { getLoadingOrderById } from "@/services/sales/loading-order.service";

export default async function ChannelLoadingLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getLoadingOrderById(id);
  if (!doc) notFound();
  await redirectLegacyToPublicUrl("sales.loading", id, "view");
}

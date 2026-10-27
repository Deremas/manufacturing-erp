import { notFound } from "next/navigation";

import { redirectLegacyToPublicUrl } from "@/lib/routing/legacy-redirect";
import { getSaleById } from "@/services/sales/sales.service";

export default async function ChannelSaleLegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const sale = await getSaleById(id);
  if (!sale) notFound();
  await redirectLegacyToPublicUrl("sales.sale", id, "view");
}

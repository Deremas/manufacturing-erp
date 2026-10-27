import { notFound, redirect } from "next/navigation";

import { procurementEditUrl } from "@/lib/procurement/routes";
import { getPurchaseOrderById } from "@/services/procurement/purchase-order.service";

export default async function LegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getPurchaseOrderById(id);
  if (!doc) notFound();
  redirect(procurementEditUrl("po", doc.publicId));
}

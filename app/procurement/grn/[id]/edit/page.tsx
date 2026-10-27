import { notFound, redirect } from "next/navigation";

import { procurementEditUrl } from "@/lib/procurement/routes";
import { getGoodsReceiptById } from "@/services/procurement/grn.service";

export default async function LegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getGoodsReceiptById(id);
  if (!doc) notFound();
  redirect(procurementEditUrl("grn", doc.publicId));
}

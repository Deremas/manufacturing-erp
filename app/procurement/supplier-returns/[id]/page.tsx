import { notFound, redirect } from "next/navigation";

import { procurementViewUrl } from "@/lib/procurement/routes";
import { getSupplierReturnById } from "@/services/procurement/supplier-return.service";

export default async function LegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getSupplierReturnById(id);
  if (!doc) notFound();
  redirect(procurementViewUrl("return", doc.publicId));
}

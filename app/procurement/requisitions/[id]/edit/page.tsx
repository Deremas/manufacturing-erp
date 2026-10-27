import { notFound, redirect } from "next/navigation";

import { procurementEditUrl } from "@/lib/procurement/routes";
import { getPurchaseRequisitionById } from "@/services/procurement/requisition.service";

export default async function LegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getPurchaseRequisitionById(id);
  if (!doc) notFound();
  redirect(procurementEditUrl("pr", doc.publicId));
}

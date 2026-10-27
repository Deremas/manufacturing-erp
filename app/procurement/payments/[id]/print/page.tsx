import { notFound, redirect } from "next/navigation";

import { procurementPrintUrl } from "@/lib/procurement/routes";
import { getSupplierPaymentById } from "@/services/procurement/supplier-payment.service";

export default async function LegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getSupplierPaymentById(id);
  if (!doc) notFound();
  redirect(procurementPrintUrl("payment", doc.publicId));
}

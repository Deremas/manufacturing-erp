import { notFound, redirect } from "next/navigation";

import { procurementPrintUrl } from "@/lib/procurement/routes";
import { getSupplierInvoiceById } from "@/services/procurement/supplier-invoice.service";

export default async function LegacyRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const doc = await getSupplierInvoiceById(id);
  if (!doc) notFound();
  redirect(procurementPrintUrl("invoice", doc.publicId));
}

import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { SalesQuotationDetailPage } from "@/features/sales/CommercialSalesPages";
import { getSalesQuotationById } from "@/services/sales/quotation.service";

export default async function SalesQuotationDetailRoute({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;

  const [item, preferences] = await Promise.all([
    getSalesQuotationById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  if (!item) {
    notFound();
  }

  return <SalesQuotationDetailPage item={item} currencyCode={preferences.currencyCode} />;
}

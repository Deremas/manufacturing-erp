import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { SalesOrderDetailPage } from "@/features/sales/CommercialSalesPages";
import { getSalesOrderById } from "@/services/sales/sales-order.service";

export default async function SalesOrderDetailRoute({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;

  const [item, preferences] = await Promise.all([
    getSalesOrderById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  if (!item) {
    notFound();
  }

  return <SalesOrderDetailPage item={item} currencyCode={preferences.currencyCode} />;
}

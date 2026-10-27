import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { SalesOrderConvertLoadingPage } from "@/features/sales/CommercialSalesPages";
import { getSalesOrderById } from "@/services/sales/sales-order.service";

export default async function ConvertSalesOrderToLoadingRoute({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireAuth();
  const { id } = await params;
  const item = await getSalesOrderById(id, { accessibleLocationIds: user.accessibleLocationIds });

  if (!item) {
    notFound();
  }

  return <SalesOrderConvertLoadingPage item={item} />;
}

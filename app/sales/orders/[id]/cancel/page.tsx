import { notFound } from "next/navigation";
import { SalesOrderCancelPage } from "@/features/sales/CommercialSalesPages";
import { requireAuth } from "@/lib/auth/auth";
import { getSalesOrderById } from "@/services/sales/sales-order.service";

export default async function CancelSalesOrderRoute({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const item = await getSalesOrderById(id, { accessibleLocationIds: user.accessibleLocationIds });
  if (!item) notFound();
  return <SalesOrderCancelPage item={item} />;
}

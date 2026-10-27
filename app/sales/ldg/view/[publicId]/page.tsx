import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { LoadingOrderDetailPage } from "@/features/sales/LoadingOrderPages";
import { getLoadingOrderById } from "@/services/sales/loading-order.service";

export default async function LoadingOrderDetailRoute({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;

  const [item, preferences] = await Promise.all([
    getLoadingOrderById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  if (!item) {
    notFound();
  }

  return <LoadingOrderDetailPage item={item} currencyCode={preferences.currencyCode} />;
}

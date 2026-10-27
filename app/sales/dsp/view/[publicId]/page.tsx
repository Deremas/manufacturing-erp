import { notFound } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { SalesDispatchDetailPage } from "@/features/sales/DispatchPages";
import { getSalesDispatchById } from "@/services/sales/sales-dispatch.service";

export default async function SalesDispatchDetailRoute({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;

  const [item, preferences] = await Promise.all([
    getSalesDispatchById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  if (!item) {
    notFound();
  }

  return <SalesDispatchDetailPage item={item} currencyCode={preferences.currencyCode} />;
}

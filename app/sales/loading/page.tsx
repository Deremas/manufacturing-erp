import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { listLoadingOrders } from "@/services/sales/loading-order.service";
import { LoadingOrdersListPage } from "@/features/sales/LoadingOrderPages";

export default async function SalesLoadingPage() {
  const user = await requireAuth();
  const [items, preferences] = await Promise.all([
    listLoadingOrders({
      accessibleLocationIds: user.accessibleLocationIds,
    }),
    getSystemPreferences(),
  ]);

  return <LoadingOrdersListPage items={items} currencyCode={preferences.currencyCode} />;
}

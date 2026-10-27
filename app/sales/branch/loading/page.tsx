import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { LoadingOrdersListPage } from "@/features/sales/LoadingOrderPages";
import { listLoadingOrders } from "@/services/sales/loading-order.service";

export default async function BranchLoadingListPage() {
  const user = await requireAuth();
  const [items, preferences] = await Promise.all([
    listLoadingOrders({
      accessibleLocationIds: user.accessibleLocationIds,
      channel: "BRANCH",
    }),
    getSystemPreferences(),
  ]);

  return (
    <LoadingOrdersListPage
      items={items}
      forcedChannel="BRANCH"
      currencyCode={preferences.currencyCode}
    />
  );
}

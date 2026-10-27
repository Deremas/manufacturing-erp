import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { SalesDispatchListPage } from "@/features/sales/DispatchPages";
import { listSalesDispatches } from "@/services/sales/sales-dispatch.service";

export default async function SalesDispatchListRoute() {
  const user = await requireAuth();
  const [items, preferences] = await Promise.all([
    listSalesDispatches({ accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  return <SalesDispatchListPage items={items} currencyCode={preferences.currencyCode} />;
}

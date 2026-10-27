import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { SalesOrdersListPage } from "@/features/sales/CommercialSalesPages";
import { listSalesOrders } from "@/services/sales/sales-order.service";

export default async function SalesOrdersRoute() {
  const user = await requireAuth();
  const [items, preferences] = await Promise.all([
    listSalesOrders({ accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  return <SalesOrdersListPage items={items} currencyCode={preferences.currencyCode} />;
}

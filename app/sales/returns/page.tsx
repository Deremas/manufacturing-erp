import { requireAuth } from "@/lib/auth/auth";
import { SalesReturnsListPage } from "@/features/sales/SalesReturnsListPage";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { listSalesReturns } from "@/services/sales/sales.service";

export default async function SalesReturnsPage() {
  const user = await requireAuth();
  const [items, preferences] = await Promise.all([
    listSalesReturns({ accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  return (
    <SalesReturnsListPage
      items={items}
      currencyCode={preferences.currencyCode}
    />
  );
}

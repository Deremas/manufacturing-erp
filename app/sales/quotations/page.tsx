import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { SalesQuotationsListPage } from "@/features/sales/CommercialSalesPages";
import { listSalesQuotations } from "@/services/sales/quotation.service";

export default async function SalesQuotationsRoute() {
  const user = await requireAuth();
  const [items, preferences] = await Promise.all([
    listSalesQuotations({ accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  return <SalesQuotationsListPage items={items} currencyCode={preferences.currencyCode} />;
}

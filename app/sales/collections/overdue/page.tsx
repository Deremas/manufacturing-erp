import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { CollectionsOverduePage } from "@/features/sales/CollectionsPages";
import { listOverdueCustomers } from "@/services/sales/collections.service";

export default async function SalesCollectionsOverduePage() {
  const user = await requireAuth();
  const [items, preferences] = await Promise.all([
    listOverdueCustomers({ accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  return <CollectionsOverduePage items={items} currencyCode={preferences.currencyCode} />;
}

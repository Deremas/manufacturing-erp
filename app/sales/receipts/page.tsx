import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { CustomerReceiptsListPage } from "@/features/sales/AccountsReceivablePages";
import { listCustomerReceipts } from "@/services/sales/accounts-receivable.service";

export default async function CustomerReceiptsPage() {
  const user = await requireAuth();
  const [items, preferences] = await Promise.all([
    listCustomerReceipts({ accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  return (
    <CustomerReceiptsListPage
      items={items}
      currencyCode={preferences.currencyCode}
    />
  );
}

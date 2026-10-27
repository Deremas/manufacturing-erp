import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { AccountsReceivableAgingPage } from "@/features/sales/AccountsReceivablePages";
import { getAccountsReceivableAgingReport } from "@/services/sales/accounts-receivable.service";

export default async function AccountsReceivableAgingRoutePage() {
  const user = await requireAuth();
  const [rows, preferences] = await Promise.all([
    getAccountsReceivableAgingReport({ accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  return (
    <AccountsReceivableAgingPage
      rows={rows}
      currencyCode={preferences.currencyCode}
    />
  );
}

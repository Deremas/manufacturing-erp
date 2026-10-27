import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { AccountsReceivableSummaryPage } from "@/features/sales/AccountsReceivablePages";
import { getAccountsReceivableCustomerSummary } from "@/services/sales/accounts-receivable.service";

export default async function AccountsReceivableSummaryRoutePage() {
  const user = await requireAuth();
  const [rows, preferences] = await Promise.all([
    getAccountsReceivableCustomerSummary({ accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  return (
    <AccountsReceivableSummaryPage
      rows={rows}
      currencyCode={preferences.currencyCode}
    />
  );
}

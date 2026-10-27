import { AccountsReceivableSummaryPage } from "@/features/sales/AccountsReceivablePages";
import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { getAccountsReceivableCustomerSummary } from "@/services/sales/accounts-receivable.service";

export const dynamic = "force-dynamic";

export default async function SalesReceivablesPage() {
  const user = await requireAuth();
  const [rows, preferences] = await Promise.all([
    getAccountsReceivableCustomerSummary({ accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);
  return <AccountsReceivableSummaryPage rows={rows} currencyCode={preferences.currencyCode} />;
}

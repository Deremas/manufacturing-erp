import { AccountsReceivableAgingPage } from "@/features/sales/AccountsReceivablePages";
import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { getAccountsReceivableAgingReport } from "@/services/sales/accounts-receivable.service";

export const dynamic = "force-dynamic";

export default async function CustomerAgingRoute({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const [rows, preferences] = await Promise.all([
    getAccountsReceivableAgingReport({ accessibleLocationIds: user.accessibleLocationIds, customerId: id }),
    getSystemPreferences(),
  ]);
  return <AccountsReceivableAgingPage rows={rows} currencyCode={preferences.currencyCode} />;
}

import { CustomerStatementPage } from "@/features/sales/AccountsReceivablePages";
import { requireAuth } from "@/lib/auth/auth";
import { getCustomers } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { getCustomerStatement } from "@/services/sales/accounts-receivable.service";

export const dynamic = "force-dynamic";

export default async function CustomerStatementRoute({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const { id } = await params;
  const [statement, customers, preferences] = await Promise.all([
    getCustomerStatement(id, { accessibleLocationIds: user.accessibleLocationIds }),
    getCustomers(),
    getSystemPreferences(),
  ]);
  return <CustomerStatementPage statement={statement} customers={customers} selectedCustomerId={id} currencyCode={preferences.currencyCode} />;
}

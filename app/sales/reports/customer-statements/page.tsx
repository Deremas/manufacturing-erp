import { requireAuth } from "@/lib/auth/auth";
import { getCustomers } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { CustomerStatementPage } from "@/features/sales/AccountsReceivablePages";
import { getCustomerStatement } from "@/services/sales/accounts-receivable.service";

export default async function CustomerStatementsRoutePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const customerId = typeof params.customerId === "string" ? params.customerId : null;

  const [customers, preferences, statement] = await Promise.all([
    getCustomers(),
    getSystemPreferences(),
    customerId
      ? getCustomerStatement(customerId, { accessibleLocationIds: user.accessibleLocationIds })
      : Promise.resolve(null),
  ]);

  return (
    <CustomerStatementPage
      statement={statement}
      customers={customers}
      selectedCustomerId={customerId}
      currencyCode={preferences.currencyCode}
    />
  );
}

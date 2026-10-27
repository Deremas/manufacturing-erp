import { requireAuth } from "@/lib/auth/auth";
import { getBankAccounts, getCustomers, getLocations } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { CustomerReceiptFormPage } from "@/features/sales/AccountsReceivablePages";
import { listOpenSalesInvoices } from "@/services/sales/accounts-receivable.service";
import { filterLocationsForUser } from "@/services/sales/sales-access.service";

export default async function CreateCustomerReceiptPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const initialInvoiceId = typeof params.invoiceId === "string" ? params.invoiceId : null;

  const [customers, locations, bankAccounts, openInvoices, preferences] = await Promise.all([
    getCustomers(),
    getLocations(),
    getBankAccounts(),
    listOpenSalesInvoices({ accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  return (
    <CustomerReceiptFormPage
      customers={customers.filter((customer) => customer.isActive)}
      locations={filterLocationsForUser(user, locations)}
      bankAccounts={bankAccounts.filter((account) => account.isActive)}
      openInvoices={openInvoices}
      currencyCode={preferences.currencyCode}
      currencyLabel={preferences.currencyLabel}
      initialInvoiceId={initialInvoiceId}
    />
  );
}

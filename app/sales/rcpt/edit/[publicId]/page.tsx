import { requireAuth } from "@/lib/auth/auth";
import { getBankAccounts, getCustomers, getLocations } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { CustomerReceiptFormPage } from "@/features/sales/AccountsReceivablePages";
import { getCustomerReceiptById, listOpenSalesInvoices } from "@/services/sales/accounts-receivable.service";
import { filterLocationsForUser } from "@/services/sales/sales-access.service";

export default async function EditCustomerReceiptPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;

  const receipt = await getCustomerReceiptById(publicId, {
    accessibleLocationIds: user.accessibleLocationIds,
  });

  const [customers, locations, bankAccounts, openInvoices, preferences] = await Promise.all([
    getCustomers(),
    getLocations(),
    getBankAccounts(),
    listOpenSalesInvoices(
      {
        accessibleLocationIds: user.accessibleLocationIds,
        customerId: receipt?.customerId,
      },
      {
        includeInvoiceIds: receipt?.allocations.map((allocation) => allocation.salesInvoiceId) ?? [],
      },
    ),
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
      initialReceipt={receipt}
    />
  );
}

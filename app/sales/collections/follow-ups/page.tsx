import { requireAuth } from "@/lib/auth/auth";
import { getUsers } from "@/lib/administration-db";
import { getCustomers } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { CollectionsFollowUpsPage } from "@/features/sales/CollectionsPages";
import { listOpenSalesInvoices } from "@/services/sales/accounts-receivable.service";
import { listCollectionFollowUps } from "@/services/sales/collections.service";

export default async function SalesCollectionsFollowUpsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const initialEditId = typeof params.edit === "string" ? params.edit : null;
  const [items, customers, openInvoices, users, preferences] = await Promise.all([
    listCollectionFollowUps({ accessibleLocationIds: user.accessibleLocationIds }),
    getCustomers(),
    listOpenSalesInvoices({ accessibleLocationIds: user.accessibleLocationIds }),
    getUsers(),
    getSystemPreferences(),
  ]);

  return (
    <CollectionsFollowUpsPage
      items={items}
      customers={customers.filter((customer) => customer.isActive)}
      openInvoices={openInvoices}
      users={users.filter((entry) => entry.isActive)}
      currencyCode={preferences.currencyCode}
      initialEditId={initialEditId}
    />
  );
}

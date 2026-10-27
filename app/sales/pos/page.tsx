import { requireAuth } from "@/lib/auth/auth";
import { getBankAccounts, getCustomers, getLocations } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { PointOfSalePricingWorkspace } from "@/features/sales/ChannelSalesWorkspace";
import { filterLocationsForUser } from "@/services/sales/sales-access.service";

export default async function PointOfSalePage() {
  const user = await requireAuth();
  const [locations, customers, bankAccounts, preferences] = await Promise.all([
    getLocations(),
    getCustomers(),
    getBankAccounts(),
    getSystemPreferences(),
  ]);

  const accessibleLocations = filterLocationsForUser(user, locations);

  return (
    <PointOfSalePricingWorkspace
      locations={accessibleLocations}
      customers={customers.filter((customer) => customer.isActive)}
      bankAccounts={bankAccounts.filter((account) => account.isActive)}
      currencyCode={preferences.currencyCode}
      currencyLabel={preferences.currencyLabel}
    />
  );
}

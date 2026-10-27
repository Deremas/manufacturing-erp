import { getCustomers, getLocations } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { PriceListForm } from "@/features/master-data/components";
import {
  getCustomerGroups,
  getSaleableItems,
} from "@/services/master-data/priceListService";

export default async function CreatePriceListPage() {
  const [saleableItems, customers, locations, customerGroups, preferences] =
    await Promise.all([
      getSaleableItems(),
      getCustomers(),
      getLocations(),
      getCustomerGroups(),
      getSystemPreferences(),
    ]);

  return (
    <PriceListForm
      mode="create"
      saleableItems={saleableItems}
      customers={customers}
      locations={locations}
      customerGroups={customerGroups}
      currencyCode={preferences.currencyCode}
      currencyLabel={preferences.currencyLabel}
    />
  );
}

import { getCustomers, getLocations } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { getSaleableItems } from "@/services/master-data/priceListService";
import { listUsers } from "@/services/production/production-shared.service";

export async function getCommercialSalesReferenceData() {
  const [customers, locations, saleableItems, salesPeople, preferences] = await Promise.all([
    getCustomers(),
    getLocations(),
    getSaleableItems(),
    listUsers(),
    getSystemPreferences(),
  ]);

  return {
    customers,
    locations,
    saleableItems,
    salesPeople,
    currencyCode: preferences.currencyCode,
    currencyLabel: preferences.currencyLabel,
  };
}

import { getRoles, getUsers } from "@/lib/administration-db";
import { getDepartments, getLocations, getSuppliers } from "@/lib/master-data-db";
import { getItemRows } from "@/lib/server/item-data";

import { getAssetTypes, getAssets, getMaintenanceTickets } from "@/services/maintenance/maintenance.service";
import { listAssetCategories } from "@/services/maintenance/asset-lifecycle.service";

export async function getMaintenanceReferenceData() {
  const [locations, departments, users, roles, suppliers, assetTypes, assetCategories, assets, tickets, items] = await Promise.all([
    getLocations(),
    getDepartments(),
    getUsers(),
    getRoles(),
    getSuppliers(),
    getAssetTypes(),
    listAssetCategories(),
    getAssets(),
    getMaintenanceTickets(),
    getItemRows(),
  ]);

  return { locations, departments, users, roles, suppliers, assetTypes, assetCategories, assets, tickets, items };
}

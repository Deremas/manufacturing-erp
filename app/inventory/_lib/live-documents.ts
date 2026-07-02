import { getUsers } from "@/lib/administration-db";
import { getCurrentUser } from "@/lib/auth/auth";
import { getLocations, getDepartments } from "@/lib/master-data-db";
import { getItemRows } from "@/lib/server/item-data";

export async function getInventoryReferenceData() {
  const [items, locations, departments, users, currentUser] = await Promise.all([
    getItemRows(),
    getLocations(),
    getDepartments(),
    getUsers(),
    getCurrentUser(),
  ]);

  return {
    currentUser,
    items: items.map((item) => ({
      value: item.id,
      label: `${item.itemCode} - ${item.itemName}`,
      itemCode: item.itemCode,
      itemName: item.itemName,
      uom: item.uomName,
      unitCost: item.standardCost,
    })),
    locations: locations.map((location) => ({
      value: location.id,
      label: location.locationName,
    })),
    departments: departments.map((department) => ({
      value: department.id,
      label: department.name,
    })),
    users: users.map((user) => ({
      value: user.id,
      label: user.name,
    })),
  };
}

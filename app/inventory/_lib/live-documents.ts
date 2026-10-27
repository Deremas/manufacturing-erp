import { getUsers } from "@/lib/administration-db";
import { getCurrentUser } from "@/lib/auth/auth";
import { getLocations, getDepartments } from "@/lib/master-data-db";
import { formatItemOptionLabel, formatUomLabel, getItemRows } from "@/lib/server/item-data";
import { isPlaceholderItem } from "@/lib/item-display";
import { getShiftDefinitions } from "@/services/production/production-shared.service";

function shiftOptionLabel(shift: { code: string; name: string; startTime?: string; endTime?: string }) {
  const title = shift.name || shift.code;
  if (shift.startTime && shift.endTime) {
    return `${title} (${shift.startTime}–${shift.endTime})`;
  }
  return title;
}

export async function getInventoryReferenceData() {
  const [items, locations, departments, users, currentUser, shifts] = await Promise.all([
    getItemRows(),
    getLocations(),
    getDepartments(),
    getUsers(),
    getCurrentUser(),
    getShiftDefinitions(),
  ]);

  return {
    currentUser,
    items: items
      .filter((item) => item.isActive && !isPlaceholderItem(item.itemName, item.itemCode))
      .map((item) => ({
      value: item.id,
      label: formatItemOptionLabel(item),
      itemCode: item.itemCode,
      itemName: item.itemName,
      uom: formatUomLabel({ uomCode: item.uomCode, uomName: item.uomName }),
      uomName: formatUomLabel({ uomCode: item.uomCode, uomName: item.uomName }),
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
    shifts: shifts
      .filter((shift) => shift.code)
      .map((shift) => ({
        value: shift.code,
        label: shiftOptionLabel(shift),
      })),
  };
}

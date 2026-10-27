import { ProductionBinCardPage } from "@/features/inventory";
import { isPlaceholderItem } from "@/lib/item-display";
import { getLocations } from "@/lib/master-data-db";
import { formatItemOptionLabel, getItemRows } from "@/lib/server/item-data";
import { getShiftDefinitions } from "@/services/production/production-shared.service";

export const dynamic = "force-dynamic";

export default async function ProductionBinCardRoute() {
  const [items, locations, shifts] = await Promise.all([
    getItemRows(),
    getLocations(),
    getShiftDefinitions(),
  ]);

  return (
    <ProductionBinCardPage
      itemOptions={items
        .filter(
          (item) =>
            item.isActive !== false && !isPlaceholderItem(item.itemName, item.itemCode),
        )
        .map((item) => ({
          value: item.id,
          label: formatItemOptionLabel(item),
          group: item.itemTypeName || item.itemType || item.categoryName || "Other",
        }))
        .sort((a, b) => {
          const byGroup = a.group.localeCompare(b.group, undefined, { sensitivity: "base" });
          return byGroup !== 0
            ? byGroup
            : a.label.localeCompare(b.label, undefined, { sensitivity: "base" });
        })}
      locationOptions={locations.map((location) => ({
        value: location.id,
        label: location.locationName,
      }))}
      shiftOptions={shifts
        .filter((shift) => shift.code)
        .map((shift) => ({
          value: shift.code,
          label: shift.name ? `${shift.code} — ${shift.name}` : shift.code,
        }))}
    />
  );
}

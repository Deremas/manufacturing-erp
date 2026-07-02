import MovementsPage from "@/features/inventory/movements/MovementsPage";
import { getItemRows } from "@/lib/server/item-data";
import { getLocations } from "@/lib/master-data-db";
import { listStockMovements } from "@/services/inventory/stock-movement.service";

export default async function StockMovementsRoute() {
  const [movements, items, locations] = await Promise.all([
    listStockMovements(),
    getItemRows(),
    getLocations(),
  ]);

  return (
    <MovementsPage
      initialData={movements}
      itemOptions={items.map((item) => ({
        label: `${item.itemCode} - ${item.itemName}`,
        value: item.id,
      }))}
      locationOptions={locations.map((location) => ({
        label: location.locationName,
        value: location.id,
      }))}
    />
  );
}

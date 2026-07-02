import BinCardPage from "@/features/inventory/bin-card/BinCardPage";
import { getItemRows } from "@/lib/server/item-data";
import { getLocations } from "@/lib/master-data-db";
import { getBinCard } from "@/services/inventory/bin-card.service";
import { listStockBalances } from "@/services/inventory/stock-balance.service";

export default async function BinCardRoute() {
  const [balances, items, locations] = await Promise.all([
    listStockBalances(),
    getItemRows(),
    getLocations(),
  ]);

  const firstBalance = balances[0];
  const rows = firstBalance
    ? await getBinCard(firstBalance.itemId, firstBalance.locationId)
    : [];

  return (
    <BinCardPage
      initialData={rows}
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

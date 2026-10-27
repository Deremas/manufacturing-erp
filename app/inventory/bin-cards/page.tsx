export const dynamic = "force-dynamic";

import { sql } from "@/lib/db";
import { getCategories, getLocations } from "@/lib/master-data-db";
import { listStockBalances } from "@/services/inventory/stock-balance.service";
import BinCardsDashboardPage from "@/features/inventory/bin-cards/BinCardsDashboardPage";

export default async function BinCardsRoute() {
  const [balances, locations, categories, movementCounts] = await Promise.all([
    listStockBalances(),
    getLocations(),
    getCategories(),
    sql<
      Array<{
        itemId: string;
        locationId: string;
        movementCount: number;
      }>
    >`
      SELECT
        "itemId",
        "locationId",
        COUNT(*)::int AS "movementCount"
      FROM "StockMovement"
      WHERE "isArchived" = false
      GROUP BY "itemId", "locationId"
    `,
  ]);

  const movementMap = new Map(
    movementCounts.map((row) => [`${row.itemId}:${row.locationId}`, Number(row.movementCount ?? 0)] as const),
  );

  return (
    <BinCardsDashboardPage
      initialData={balances.map((row) => ({
        ...row,
        movementCount: movementMap.get(`${row.itemId}:${row.locationId}`) ?? 0,
      }))}
      locationOptions={locations.map((location) => ({
        label: location.locationName,
        value: location.id,
      }))}
      categoryOptions={categories.map((category) => ({
        label: category.name,
        value: category.id,
      }))}
    />
  );
}

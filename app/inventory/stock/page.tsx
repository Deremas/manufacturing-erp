import StockOverview from "@/features/inventory/stock/StockOverview";
import { getCategories, getItemTypes, getLocations } from "@/lib/master-data-db";
import { listStockBalances } from "@/services/inventory/stock-balance.service";

export default async function StockBalancePage() {
  const [balances, locations, categories, itemTypes] = await Promise.all([
    listStockBalances(),
    getLocations(),
    getCategories(),
    getItemTypes(),
  ]);

  return (
    <StockOverview
      initialData={balances.map((row) => ({
        itemId: row.itemId,
        itemCode: row.itemCode,
        itemName: row.itemName,
        categoryId: row.categoryId ?? undefined,
        category: row.categoryName ?? "",
        itemTypeId: row.itemTypeId ?? undefined,
        itemType: row.itemTypeName ?? row.itemTypeCode ?? "",
        uomId: row.uomId ?? undefined,
        uom: row.uomName ?? row.uomCode ?? "",
        locationId: row.locationId,
        location: row.locationName,
        quantity: row.quantity,
        reserved: row.reservedQuantity,
        available: row.availableQuantity,
        lowStockAlertLevel: row.reorderPoint,
        unitCost: row.averageCost,
        totalValue: row.totalValue,
        lastMovementDate: row.lastMovementDate,
        status: row.status,
      }))}
      locationOptions={locations.map((location) => ({
        label: location.locationName,
        value: location.id,
      }))}
      categoryOptions={categories.map((category) => ({
        label: category.name,
        value: category.id,
      }))}
      itemTypeOptions={itemTypes.map((itemType) => ({
        label: itemType.name,
        value: itemType.id,
      }))}
    />
  );
}

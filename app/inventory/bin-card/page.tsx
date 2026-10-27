export const dynamic = "force-dynamic";

import { getItemRows } from "@/lib/server/item-data";
import { getLocations } from "@/lib/master-data-db";
import { listStockMovements } from "@/services/inventory/stock-movement.service";
import BinCardPage from "@/features/inventory/bin-card/BinCardPage";
import { PageHeader } from "@/components/shared";
import { colors } from "@/components/ui/colors";
import { spacing } from "@/components/ui/spacing";
import { radius } from "@/components/ui/radius";
import { typography } from "@/components/ui/typography";

export default async function BinCardRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const itemPublicId = Array.isArray(params.itemPublicId) ? params.itemPublicId[0] : params.itemPublicId;
  const itemId = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const locationPublicId = Array.isArray(params.locationPublicId) ? params.locationPublicId[0] : params.locationPublicId;
  const locationId = Array.isArray(params.locationId) ? params.locationId[0] : params.locationId;
  const [items, locations] = await Promise.all([getItemRows(), getLocations()]);
  const selectedItem =
    itemPublicId || itemId
      ? items.find(
          (item) =>
            String(item.publicId) === String(itemPublicId ?? itemId) ||
            item.id === String(itemId) ||
            `item-${item.id}` === String(itemId),
        ) ?? null
      : null;
  const selectedLocation =
    locationPublicId || locationId
      ? locations.find(
          (location) =>
            String(location.publicId) === String(locationPublicId ?? locationId) ||
            location.id === String(locationId),
        ) ?? null
      : null;

  if (!selectedItem) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: `${spacing.page.gap}px` }}>
        <PageHeader title="Stock Card / Bin Card" subtitle="Select an item to view its movement history." />
        <div
          style={{
            backgroundColor: colors.surface,
            border: `1px solid ${colors.border}`,
            borderRadius: radius.components.card,
            padding: `${spacing.card.padding}px`,
          }}
        >
          <form method="get" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <label
                style={{
                  fontSize: typography.sizes.small.fontSize,
                  fontWeight: typography.weights.medium,
                  color: colors.text.secondary,
                }}
              >
                Select Item
              </label>
              <select
                name="itemPublicId"
                defaultValue=""
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: `1px solid ${colors.inputBorder}`,
                  borderRadius: radius.components.input,
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.body.fontSize,
                  color: colors.text.primary,
                  backgroundColor: colors.surface,
                }}
              >
                <option value="">Select an item...</option>
                {items.map((item) => (
                  <option key={item.id} value={String(item.publicId)}>
                    {item.itemCode} - {item.itemName}
                  </option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end" }}>
              <button
                type="submit"
                style={{
                  padding: "10px 16px",
                  borderRadius: 12,
                  border: `1px solid ${colors.primary[200]}`,
                  backgroundColor: colors.primary[600],
                  color: colors.text.inverse,
                  fontFamily: typography.fontFamily,
                  fontSize: typography.sizes.small.fontSize,
                  fontWeight: typography.weights.semibold,
                  cursor: "pointer",
                }}
              >
                View Bin Card
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  const initialData = await listStockMovements({
    itemId: selectedItem.id,
    locationId: selectedLocation?.id,
  });

  return (
    <BinCardPage
      initialData={initialData}
      selectedItem={{
        itemCode: selectedItem.itemCode,
        itemName: selectedItem.itemName,
        itemTypeName: selectedItem.itemTypeName,
        categoryName: selectedItem.categoryName,
        uomCode: selectedItem.uomCode,
      }}
      selectedLocation={selectedLocation ? { locationName: selectedLocation.locationName } : null}
      locationOptions={locations.map((location) => ({
        label: location.locationName,
        value: location.id,
      }))}
    />
  );
}

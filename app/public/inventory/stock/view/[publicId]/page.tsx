export const dynamic = "force-dynamic";

import { notFound, redirect } from "next/navigation";
import BinCardPage from "@/features/inventory/bin-card/BinCardPage";
import { getItemRows } from "@/lib/server/item-data";
import { getLocations } from "@/lib/master-data-db";
import { getMovementsForItemLocation } from "@/services/inventory/stock-movement.service";

export default async function PublicStockViewPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ publicId }, query] = await Promise.all([params, searchParams ?? Promise.resolve({})]);
  const locationId = Array.isArray(query.locationId) ? query.locationId[0] : query.locationId;

  const [items, locations] = await Promise.all([getItemRows(), getLocations()]);
  const selectedItem =
    items.find(
      (item) =>
        String(item.publicId) === String(publicId) ||
        item.id === String(publicId) ||
        `item-${item.id}` === String(publicId),
    ) ?? null;
  if (!selectedItem) {
    notFound();
  }

  const canonicalPublicId = String(selectedItem.publicId);
  if (String(publicId) !== canonicalPublicId) {
    const locationQuery = locationId ? `?locationId=${encodeURIComponent(locationId)}` : "";
    redirect(`/public/inventory/stock/view/${canonicalPublicId}${locationQuery}`);
  }

  const selectedLocation = locationId
    ? locations.find((location) => location.id === locationId) ?? null
    : null;

  const initialData = await getMovementsForItemLocation(selectedItem.id, locationId);

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

export const dynamic = "force-dynamic";

import MovementsPage from "@/features/inventory/movements/MovementsPage";
import { redirect } from "next/navigation";
import { formatItemOptionLabel, getItemRows } from "@/lib/server/item-data";
import { getLocations } from "@/lib/master-data-db";
import { listStockMovements } from "@/services/inventory/stock-movement.service";

export default async function StockMovementsRoute({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const itemIdParam = Array.isArray(params.itemId) ? params.itemId[0] : params.itemId;
  const itemPublicIdParam = Array.isArray(params.itemPublicId) ? params.itemPublicId[0] : params.itemPublicId;
  const locationIdParam = Array.isArray(params.locationId) ? params.locationId[0] : params.locationId;
  const locationPublicIdParam = Array.isArray(params.locationPublicId)
    ? params.locationPublicId[0]
    : params.locationPublicId;
  const [items, locations] = await Promise.all([
    getItemRows(),
    getLocations(),
  ]);
  const itemId =
    itemIdParam
    ?? (itemPublicIdParam ? items.find((item) => String(item.publicId) === String(itemPublicIdParam))?.id : undefined);
  const locationId =
    locationIdParam
    ?? (locationPublicIdParam
      ? locations.find((location) => String(location.publicId) === String(locationPublicIdParam))?.id
      : undefined);
  const canonicalItemPublicId =
    itemPublicIdParam
    ?? (itemIdParam ? items.find((item) => item.id === itemIdParam)?.publicId?.toString() : undefined);
  const canonicalLocationPublicId =
    locationPublicIdParam
    ?? (locationIdParam ? locations.find((location) => location.id === locationIdParam)?.publicId?.toString() : undefined);
  if ((itemIdParam || locationIdParam) && (canonicalItemPublicId || canonicalLocationPublicId)) {
    const nextParams = new URLSearchParams();
    if (canonicalItemPublicId) nextParams.set("itemPublicId", canonicalItemPublicId);
    if (canonicalLocationPublicId) nextParams.set("locationPublicId", canonicalLocationPublicId);
    redirect(`/inventory/movements${nextParams.toString() ? `?${nextParams.toString()}` : ""}`);
  }
  const initialData = await listStockMovements({
    itemId,
    locationId,
  });

  return (
    <MovementsPage
      initialData={initialData}
      itemOptions={items.map((item) => ({
        label: formatItemOptionLabel(item),
        value: item.id,
      }))}
      locationOptions={locations.map((location) => ({
        label: location.locationName,
        value: location.id,
      }))}
    />
  );
}

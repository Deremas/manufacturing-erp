import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { redirect } from "next/navigation";
import { sql } from "@/lib/db";
import { peekNextDocumentNumber } from "@/lib/document-numbering";
import { getItemRows } from "@/lib/server/item-data";
import { getLocations } from "@/lib/master-data-db";

export default async function CreateAdjustmentRoute({
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
  const referenceData = await getInventoryReferenceData();
  const [items, locations] = await Promise.all([getItemRows(), getLocations()]);
  const resolvedItemId =
    itemIdParam
    ?? (itemPublicIdParam ? items.find((item) => String(item.publicId) === String(itemPublicIdParam))?.id : undefined);
  const resolvedLocationId =
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

  if (canonicalItemPublicId || canonicalLocationPublicId) {
    const nextParams = new URLSearchParams();
    if (canonicalItemPublicId) nextParams.set("itemPublicId", canonicalItemPublicId);
    if (canonicalLocationPublicId) nextParams.set("locationPublicId", canonicalLocationPublicId);
    const nextQuery = nextParams.toString();
    if (
      itemIdParam || locationIdParam
    ) {
      redirect(`/inventory/adjustments/create${nextQuery ? `?${nextQuery}` : ""}`);
    }
  }
  const initialValue =
    resolvedItemId || resolvedLocationId
      ? {
          adjustmentNo: await sql.begin(async (tx) => peekNextDocumentNumber(tx, "ADJ", "Stock Adjustment")),
          locationId: resolvedLocationId ?? "",
          items: resolvedItemId
            ? [{ itemId: resolvedItemId, systemQty: 0, physicalQty: 0, differenceQty: 0, unitCost: 0, remarks: "" }]
            : [],
        }
      : {
          adjustmentNo: await sql.begin(async (tx) => peekNextDocumentNumber(tx, "ADJ", "Stock Adjustment")),
        };

  return (
    <InventoryDocumentEditor
      kind="adjustment"
      mode="create"
      routeKey="inventory.adjustment"
      title="Create Stock Adjustment"
      subtitle="Capture system-versus-physical differences and let posting generate the movements."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Adjustments", href: "/inventory/adjustments" },
        { label: "Create" },
      ]}
      apiBasePath="/api/inventory/adjustments"
      cancelHref="/inventory/adjustments"
      successHref="/inventory/adjustments"
      initialValue={initialValue}
      items={referenceData.items}
      locations={referenceData.locations}
    />
  );
}

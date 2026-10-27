import { getProcurementReferenceData } from "@/app/procurement/_lib/reference-data";
import { PurchaseRequisitionEditor } from "@/features/procurement/document-pages";
import { getItemRows } from "@/lib/server/item-data";
import { getLocations } from "@/lib/master-data-db";
import { peekProcurementDocumentNumber } from "@/services/procurement/procurement-shared.service";

export default async function CreatePurchaseRequisitionPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = searchParams ? await searchParams : {};
  const itemPublicIdParam = Array.isArray(params.itemPublicId) ? params.itemPublicId[0] : params.itemPublicId;
  const locationPublicIdParam = Array.isArray(params.locationPublicId)
    ? params.locationPublicId[0]
    : params.locationPublicId;

  const [referenceData, nextRequisitionNo, itemRows, locationRows] = await Promise.all([
    getProcurementReferenceData(),
    peekProcurementDocumentNumber("PR", "Purchase Requisition"),
    getItemRows(),
    getLocations(),
  ]);
  const selectedItem = itemPublicIdParam
    ? itemRows.find((item) => String(item.publicId) === String(itemPublicIdParam) || item.id === itemPublicIdParam)
    : null;
  const selectedLocation = locationPublicIdParam
    ? locationRows.find((location) => String(location.publicId) === String(locationPublicIdParam) || location.id === locationPublicIdParam)
    : null;

  const initialItems = selectedItem
    ? [
        {
          itemId: selectedItem.id,
          uomId: selectedItem.uomId ?? "",
          requestedQty: 0,
          approvedQty: 0,
          estimatedUnitPrice: Number(selectedItem.standardCost ?? 0),
          remarks: "",
        },
      ]
    : [
        {
          itemId: "",
          uomId: "",
          requestedQty: 0,
          approvedQty: 0,
          estimatedUnitPrice: 0,
          remarks: "",
        },
      ];

  return (
    <PurchaseRequisitionEditor
      mode="create"
      title="Create Purchase Requisition"
      subtitle="Capture an internal buying need and route it through approval before conversion to a purchase order."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Purchase Requisitions", href: "/procurement/requisitions" },
        { label: "Create" },
      ]}
      apiBasePath="/api/procurement/requisitions"
      cancelHref="/procurement/requisitions"
      successHref="/procurement/requisitions"
      requisitionNo={nextRequisitionNo}
      departments={referenceData.departments}
      locations={referenceData.locations}
      items={referenceData.items}
      initialValue={{
        requisitionDate: new Date().toISOString().slice(0, 10),
        requestedById: referenceData.currentUser?.id ?? "",
        departmentId: "",
        locationId: selectedLocation?.id ?? "",
        neededByDate: "",
        purpose: "",
        requestType: "INVENTORY_PURCHASE",
        remarks: "",
        items: initialItems,
      }}
    />
  );
}

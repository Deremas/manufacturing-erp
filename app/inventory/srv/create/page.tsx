import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { formatStoreRequisitionNumber } from "@/app/inventory/_lib/requisition-number";
import { peekNextDocumentNumber } from "@/lib/document-numbering/allocate";
import { sql } from "@/lib/db";

export default async function CreateStoreRequisitionRoute() {
  const referenceData = await getInventoryReferenceData();
  const requisitionNo = formatStoreRequisitionNumber(
    await peekNextDocumentNumber(sql, "SRV", "Store Requisition"),
  );

  return (
    <InventoryDocumentEditor
      kind="requisition"
      mode="create"
      routeKey="inventory.requisition"
      title="Create Store Requisition"
      subtitle="Request items from store using live users, locations, departments, and items."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Store Requisitions", href: "/inventory/requisitions" },
        { label: "Create" },
      ]}
      apiBasePath="/api/inventory/srv"
      cancelHref="/inventory/requisitions"
      successHref="/inventory/requisitions"
      initialValue={{
        requestedById: referenceData.currentUser?.id ?? "",
        requisitionNo,
      }}
      items={referenceData.items}
      locations={referenceData.locations}
      departments={referenceData.departments}
      users={referenceData.users}
      shifts={referenceData.shifts}
    />
  );
}

import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";

export default async function CreateStoreRequisitionRoute() {
  const referenceData = await getInventoryReferenceData();

  return (
    <InventoryDocumentEditor
      kind="requisition"
      mode="create"
      title="Create Store Requisition"
      subtitle="Request items from store using live users, locations, departments, and items."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Store Requisitions", href: "/inventory/srv" },
        { label: "Create" },
      ]}
      apiBasePath="/api/inventory/srv"
      cancelHref="/inventory/srv"
      successHref="/inventory/srv"
      initialValue={{ requestedById: referenceData.currentUser?.id ?? "" }}
      items={referenceData.items}
      locations={referenceData.locations}
      departments={referenceData.departments}
      users={referenceData.users}
    />
  );
}

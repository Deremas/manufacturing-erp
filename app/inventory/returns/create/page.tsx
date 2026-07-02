import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";

export default async function CreateReturnRoute() {
  const referenceData = await getInventoryReferenceData();

  return (
    <InventoryDocumentEditor
      kind="return"
      mode="create"
      title="Create Stock Return"
      subtitle="Capture materials being returned back into stock from departments or operations."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Returns", href: "/inventory/returns" },
        { label: "Create" },
      ]}
      apiBasePath="/api/inventory/returns"
      cancelHref="/inventory/returns"
      successHref="/inventory/returns"
      items={referenceData.items}
      locations={referenceData.locations}
      departments={referenceData.departments}
      users={referenceData.users}
    />
  );
}

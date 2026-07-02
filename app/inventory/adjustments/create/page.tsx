import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";

export default async function CreateAdjustmentRoute() {
  const referenceData = await getInventoryReferenceData();

  return (
    <InventoryDocumentEditor
      kind="adjustment"
      mode="create"
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
      items={referenceData.items}
      locations={referenceData.locations}
    />
  );
}

import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";

export default async function CreateTransferRoute() {
  const referenceData = await getInventoryReferenceData();

  return (
    <InventoryDocumentEditor
      kind="transfer"
      mode="create"
      title="Create Stock Transfer"
      subtitle="Create a draft or submit a stock transfer using live item and location data."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Transfers", href: "/inventory/transfers" },
        { label: "Create" },
      ]}
      apiBasePath="/api/inventory/transfers"
      cancelHref="/inventory/transfers"
      successHref="/inventory/transfers"
      items={referenceData.items}
      locations={referenceData.locations}
    />
  );
}

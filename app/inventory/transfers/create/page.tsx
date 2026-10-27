import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { sql } from "@/lib/db";
import { peekNextDocumentNumber } from "@/lib/document-numbering";

export default async function CreateTransferRoute() {
  const referenceData = await getInventoryReferenceData();
  const transferNo = await sql.begin(async (tx) => {
    const number = await peekNextDocumentNumber(tx, "TRF", "Stock Transfer");
    return number.replace(/-/g, "/");
  });
  const initialValue = { transferNo };

  return (
    <InventoryDocumentEditor
      kind="transfer"
      mode="create"
      routeKey="inventory.transfer"
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
      initialValue={initialValue}
      items={referenceData.items}
      locations={referenceData.locations}
    />
  );
}

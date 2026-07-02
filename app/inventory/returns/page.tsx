import { InventoryDocumentListPage } from "@/features/inventory/live/document-pages";
import { listReturns } from "@/services/inventory/inventory-documents.service";

export default async function ReturnsRoute() {
  const returns = await listReturns();

  return (
    <InventoryDocumentListPage
      title="Stock Returns"
      subtitle="Bring unused issued stock back into store through posted return documents."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Returns" },
      ]}
      createHref="/inventory/returns/create"
      rows={returns.map((entry) => ({
        id: entry.id,
        number: entry.returnNo,
        date: entry.returnDate,
        status: entry.status,
        itemCount: entry.itemCount,
        primaryText: entry.returnedFromName,
        secondaryText: entry.locationName,
        ownerText: entry.createdByName,
      }))}
      searchPlaceholder="Search return number, source, location, or status..."
      primaryColumnLabel="Returned From"
      secondaryColumnLabel="Location"
      ownerColumnLabel="Created By"
      baseHref="/inventory/returns"
    />
  );
}

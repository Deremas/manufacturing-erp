import { InventoryDocumentListPage } from "@/features/inventory/live/document-pages";
import { formatStockReturnNumber } from "@/app/inventory/_lib/requisition-number";
import { listReturns } from "@/services/inventory/inventory-documents.service";

export default async function ReturnsRoute() {
  const returns = await listReturns();

  return (
    <InventoryDocumentListPage
      title="Return Vouchers"
      subtitle="Process material returns from production and departments."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Returns" },
      ]}
      createHref="/inventory/returns/create"
      rows={returns.map((entry) => ({
        id: entry.id,
        publicId: entry.publicId,
        number: formatStockReturnNumber(entry.returnNo),
        date: entry.returnDate,
        status: entry.status,
        itemCount: entry.itemCount,
        primaryText: entry.returnedFromName,
        secondaryText: entry.locationName,
        ownerText: entry.createdByName,
        returnedFromType: entry.returnedFromType,
      }))}
      searchPlaceholder="Search return voucher, returned from, location, or status..."
      primaryColumnLabel="Returned From"
      secondaryColumnLabel="Location"
      ownerColumnLabel="Created By"
      routeKey="inventory.return"
    />
  );
}

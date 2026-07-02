import { InventoryDocumentListPage } from "@/features/inventory/live/document-pages";
import { listTransfers } from "@/services/inventory/inventory-documents.service";

export default async function TransfersRoute() {
  const transfers = await listTransfers();

  return (
    <InventoryDocumentListPage
      title="Stock Transfers"
      subtitle="Move stock between live locations through controlled inventory documents."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Transfers" },
      ]}
      createHref="/inventory/transfers/create"
      rows={transfers.map((transfer) => ({
        id: transfer.id,
        number: transfer.transferNo,
        date: transfer.transferDate,
        status: transfer.status,
        itemCount: transfer.itemCount,
        primaryText: transfer.fromLocationName,
        secondaryText: transfer.toLocationName,
        ownerText: transfer.createdByName,
      }))}
      searchPlaceholder="Search transfer number, location, or status..."
      primaryColumnLabel="From Location"
      secondaryColumnLabel="To Location"
      ownerColumnLabel="Created By"
      baseHref="/inventory/transfers"
    />
  );
}

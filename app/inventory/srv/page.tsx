import { InventoryDocumentListPage } from "@/features/inventory/live/document-pages";
import { listRequisitions } from "@/services/inventory/inventory-documents.service";

export default async function StoreRequisitionsRoute() {
  const requisitions = await listRequisitions();

  return (
    <InventoryDocumentListPage
      title="Store Requisitions"
      subtitle="Approve internal inventory requests before they become posted stock issues."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Store Requisitions" },
      ]}
      createHref="/inventory/srv/create"
      rows={requisitions.map((requisition) => ({
        id: requisition.id,
        number: requisition.requisitionNo,
        date: requisition.requisitionDate,
        status: requisition.status,
        itemCount: requisition.itemCount,
        primaryText: requisition.toDepartmentName ?? requisition.toLocationName ?? "Unassigned",
        secondaryText: requisition.fromLocationName ?? "-",
        ownerText: requisition.requestedByName,
      }))}
      searchPlaceholder="Search requisition number, destination, requester, or status..."
      primaryColumnLabel="Destination"
      secondaryColumnLabel="From Location"
      ownerColumnLabel="Requested By"
      baseHref="/inventory/srv"
    />
  );
}

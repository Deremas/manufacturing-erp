import { InventoryDocumentListPage } from "@/features/inventory/live/document-pages";
import { listAdjustments } from "@/services/inventory/inventory-documents.service";

export default async function AdjustmentsRoute() {
  const adjustments = await listAdjustments();

  return (
    <InventoryDocumentListPage
      title="Stock Adjustments"
      subtitle="Review and correct physical stock variances using ledger-backed adjustment documents."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Adjustments" },
      ]}
      createHref="/inventory/adjustments/create"
      rows={adjustments.map((adjustment) => ({
        id: adjustment.id,
        number: adjustment.adjustmentNo,
        date: adjustment.adjustmentDate,
        status: adjustment.status,
        itemCount: adjustment.itemCount,
        primaryText: adjustment.locationName,
        secondaryText: adjustment.reason,
        ownerText: adjustment.createdByName,
      }))}
      searchPlaceholder="Search adjustment number, location, reason, or status..."
      primaryColumnLabel="Location"
      secondaryColumnLabel="Reason"
      ownerColumnLabel="Created By"
      baseHref="/inventory/adjustments"
    />
  );
}

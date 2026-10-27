import { ProcurementListPage } from "@/features/procurement/document-pages";
import { listPurchaseRequisitions } from "@/services/procurement/requisition.service";

export default async function PurchaseRequisitionsPage() {
  const requisitions = await listPurchaseRequisitions();

  return (
    <ProcurementListPage
      title="Purchase Requisitions"
      subtitle="Manage internal buying requests before they become supplier-facing purchase orders."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Purchase Requisitions" },
      ]}
      createHref="/procurement/requisitions/create"
      baseHref="/procurement/requisitions"
      apiBasePath="/api/procurement/requisitions"
      kind="pr"
      primaryLabel="Department"
      secondaryLabel="Receiving Location"
      ownerLabel="Requested By"
      rows={requisitions.map((row) => ({
        id: row.id,
        publicId: row.publicId,
        number: row.requisitionNo,
        date: row.requisitionDate,
        status: row.status,
        primary: row.departmentName,
        secondary: row.locationName,
        owner: row.requestedByName,
        itemCount: row.itemCount,
        amount: row.estimatedTotal,
        canConvert: row.canConvert,
      }))}
    />
  );
}

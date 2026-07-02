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
      primaryLabel="Department"
      secondaryLabel="Location"
      ownerLabel="Requested By"
      rows={requisitions.map((row) => ({
        id: row.id,
        number: row.requisitionNo,
        date: row.requisitionDate,
        status: row.status,
        primary: row.departmentName,
        secondary: row.locationName,
        owner: row.requestedByName,
        itemCount: row.itemCount,
        amount: row.estimatedTotal,
      }))}
    />
  );
}

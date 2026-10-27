import RequisitionsListPage from "@/features/inventory/requisitions/RequisitionsListPage";
import { formatStoreRequisitionNumber } from "@/app/inventory/_lib/requisition-number";
import { listRequisitions } from "@/services/inventory/inventory-documents.service";

export default async function RequisitionsRoute() {
  const requisitions = await listRequisitions();

  return (
    <RequisitionsListPage
      rows={requisitions.map((requisition) => ({
        id: requisition.id,
        publicId: requisition.publicId,
        number: formatStoreRequisitionNumber(requisition.requisitionNo),
        date: requisition.requisitionDate,
        status: requisition.status,
        itemCount: requisition.itemCount,
        requestTypeText: requisition.toDepartmentName ?? requisition.toLocationName ?? "Internal",
        locationText: requisition.fromLocationName ?? "Unassigned",
        requestedByText: requisition.requestedByName,
      }))}
    />
  );
}

import { notFound } from "next/navigation";

import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getRequisitionById } from "@/services/inventory/inventory-documents.service";

export default async function EditStoreRequisitionRoute(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [requisition, referenceData] = await Promise.all([
    getRequisitionById(id),
    getInventoryReferenceData(),
  ]);

  if (!requisition) notFound();

  return (
    <InventoryDocumentEditor
      kind="requisition"
      mode="edit"
      documentId={requisition.id}
      title={`Edit ${requisition.requisitionNo}`}
      subtitle="Update the requisition before approval or issue generation."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Store Requisitions", href: "/inventory/srv" },
        { label: requisition.requisitionNo, href: `/inventory/srv/${requisition.id}` },
        { label: "Edit" },
      ]}
      apiBasePath="/api/inventory/srv"
      cancelHref={`/inventory/srv/${requisition.id}`}
      successHref="/inventory/srv"
      canEdit={requisition.status !== "CANCELLED" && requisition.status !== "ISSUED"}
      initialValue={{
        requisitionDate: requisition.requisitionDate.slice(0, 10),
        requestedById: requisition.requestedById,
        fromLocationId: requisition.fromLocationId ?? "",
        toLocationId: requisition.toLocationId ?? "",
        toDepartmentId: requisition.toDepartmentId ?? "",
        purpose: requisition.purpose,
        approverId: requisition.assignedApproverId ?? "",
        remarks: requisition.remarks,
        items: requisition.items,
      }}
      items={referenceData.items}
      locations={referenceData.locations}
      departments={referenceData.departments}
      users={referenceData.users}
    />
  );
}

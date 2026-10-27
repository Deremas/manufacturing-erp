import { notFound } from "next/navigation";

import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { formatStoreRequisitionNumber } from "@/app/inventory/_lib/requisition-number";
import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { publicListUrl, publicViewUrl } from "@/lib/routing/urls";
import { getRequisitionById } from "@/services/inventory/inventory-documents.service";

const ROUTE_KEY = "inventory.requisition" as const;

export default async function RequisitionEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [requisition, referenceData] = await Promise.all([
    getRequisitionById(publicId),
    getInventoryReferenceData(),
  ]);

  if (!requisition) notFound();

  return (
    <InventoryDocumentEditor
      kind="requisition"
      mode="edit"
      documentId={requisition.id}
      documentPublicId={requisition.publicId}
      routeKey={ROUTE_KEY}
      title={`Edit ${formatStoreRequisitionNumber(requisition.requisitionNo)}`}
      subtitle="Update the requisition before approval or issue generation."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Store Requisitions", href: "/inventory/requisitions" },
        { label: formatStoreRequisitionNumber(requisition.requisitionNo), href: publicViewUrl(ROUTE_KEY, requisition.publicId) },
        { label: "Edit" },
      ]}
      apiBasePath="/api/inventory/srv"
      cancelHref={publicViewUrl(ROUTE_KEY, requisition.publicId)}
      successHref={publicListUrl(ROUTE_KEY)}
      canEdit={requisition.status !== "CANCELLED" && requisition.status !== "ISSUED"}
      initialValue={{
        requisitionNo: formatStoreRequisitionNumber(requisition.requisitionNo),
        requisitionDate: requisition.requisitionDate.slice(0, 10),
        neededByDate: requisition.neededByDate ? requisition.neededByDate.slice(0, 10) : "",
        shiftCode: requisition.shiftCode ?? "",
        requestedById: requisition.requestedById ?? "",
        fromLocationId: requisition.fromLocationId ?? "",
        toLocationId: requisition.toLocationId ?? "",
        toDepartmentId: requisition.toDepartmentId ?? "",
        approverId: requisition.assignedApproverId ?? "",
        remarks: requisition.remarks,
        items: requisition.items,
      }}
      items={referenceData.items}
      locations={referenceData.locations}
      departments={referenceData.departments}
      users={referenceData.users}
      shifts={referenceData.shifts}
    />
  );
}

import { notFound } from "next/navigation";

import { getProcurementReferenceData } from "@/app/procurement/_lib/reference-data";
import { PurchaseRequisitionEditor } from "@/features/procurement/document-pages";
import {
  procurementListUrl,
  procurementViewUrl,
} from "@/lib/procurement/routes";
import { getPurchaseRequisitionById } from "@/services/procurement/requisition.service";

export default async function EditPurchaseRequisitionPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [requisition, referenceData] = await Promise.all([
    getPurchaseRequisitionById(publicId),
    getProcurementReferenceData(),
  ]);

  if (!requisition) {
    notFound();
  }

  return (
    <PurchaseRequisitionEditor
      mode="edit"
      documentId={requisition.id}
      documentPublicId={requisition.publicId}
      title={`Edit ${requisition.requisitionNo}`}
      subtitle="Adjust the requisition before it is fully converted into a purchase order."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Purchase Requisitions", href: "/procurement/requisitions" },
        {
          label: requisition.requisitionNo,
          href: procurementViewUrl("pr", requisition.publicId),
        },
        { label: "Edit" },
      ]}
      apiBasePath="/api/procurement/requisitions"
      cancelHref={procurementViewUrl("pr", requisition.publicId)}
      successHref={procurementListUrl("pr")}
      canEdit={
        requisition.status !== "CONVERTED" && requisition.status !== "CANCELLED"
      }
      requisitionNo={requisition.requisitionNo}
      departments={referenceData.departments}
      locations={referenceData.locations}
      items={referenceData.items}
      initialValue={{
        requisitionDate: requisition.requisitionDate.slice(0, 10),
        requestedById: requisition.requestedById,
        departmentId: requisition.departmentId,
        locationId: requisition.locationId,
        neededByDate: requisition.neededByDate?.slice(0, 10) ?? "",
        purpose: requisition.purpose,
        requestType: requisition.requestType,
        remarks: requisition.remarks,
        items: requisition.items.map((item) => ({
          itemId: item.itemId,
          uomId: item.uomId ?? "",
          requestedQty: item.requestedQty,
          approvedQty: item.approvedQty,
          estimatedUnitPrice: item.estimatedUnitPrice,
          remarks: item.remarks,
        })),
      }}
    />
  );
}

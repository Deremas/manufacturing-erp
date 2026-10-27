import { notFound } from "next/navigation";

import { getPoReferenceData } from "@/app/procurement/_lib/po-reference-data";
import { PurchaseOrderEditor } from "@/features/procurement/document-pages";
import {
  procurementListUrl,
  procurementViewUrl,
} from "@/lib/procurement/routes";
import { getPurchaseOrderById } from "@/services/procurement/purchase-order.service";

export default async function EditPurchaseOrderPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [order, referenceData] = await Promise.all([
    getPurchaseOrderById(publicId),
    getPoReferenceData(),
  ]);

  if (!order) {
    notFound();
  }

  return (
    <PurchaseOrderEditor
      mode="edit"
      documentId={order.id}
      documentPublicId={order.publicId}
      title={`Edit ${order.poNo}`}
      subtitle="Update the purchase order before receiving or closing it."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Purchase Orders", href: "/procurement/purchase-orders" },
        {
          label: order.poNo,
          href: procurementViewUrl("po", order.publicId),
        },
        { label: "Edit" },
      ]}
      apiBasePath="/api/procurement/purchase-orders"
      cancelHref={procurementViewUrl("po", order.publicId)}
      successHref={procurementListUrl("po")}
      canEdit={
        !["RECEIVED", "POSTED", "CANCELLED", "CLOSED"].includes(order.status)
      }
      poNo={order.poNo}
      suppliers={referenceData.suppliers}
      locations={referenceData.locations}
      items={referenceData.items}
      taxSettings={referenceData.taxSettings}
      paymentTerms={referenceData.paymentTerms}
      requisitions={
        order.prId && order.requisitionNo
          ? [
              { value: order.prId, label: order.requisitionNo },
              ...referenceData.requisitions.filter(
                (option) => option.value !== order.prId,
              ),
            ]
          : referenceData.requisitions
      }
      initialValue={{
        poDate: order.poDate.slice(0, 10),
        supplierId: order.supplierId,
        prId: order.prId ?? "",
        prReferenceNo: order.requisitionNo ?? undefined,
        deliveryLocationId: order.deliveryLocationId,
        expectedDeliveryDate: order.expectedDeliveryDate?.slice(0, 10) ?? "",
        paymentTerms: order.paymentTerms,
        requestType: order.requestType,
        remarks: order.remarks,
        items: order.items.map((item) => ({
          prItemId: item.prItemId ?? undefined,
          itemId: item.itemId,
          uomId: item.uomId ?? "",
          orderedQty: item.orderedQty,
          unitPrice: item.unitPrice,
          remarks: item.remarks,
        })),
      }}
    />
  );
}

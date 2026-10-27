import { notFound } from "next/navigation";

import { getProcurementReferenceData } from "@/app/procurement/_lib/reference-data";
import { SupplierReturnEditor } from "@/features/procurement/supplier-return-pages";
import {
  procurementListUrl,
  procurementViewUrl,
} from "@/lib/procurement/routes";
import { listGoodsReceipts } from "@/services/procurement/grn.service";
import { getSupplierReturnById } from "@/services/procurement/supplier-return.service";

export default async function EditSupplierReturnPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [document, referenceData, receipts] = await Promise.all([
    getSupplierReturnById(publicId),
    getProcurementReferenceData(),
    listGoodsReceipts(),
  ]);

  if (!document) {
    notFound();
  }

  return (
    <SupplierReturnEditor
      documentId={document.id}
      documentPublicId={document.publicId}
      title={`Edit ${document.returnNo}`}
      subtitle="Update the supplier return before posting it back through inventory."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Returns", href: "/procurement/supplier-returns" },
        {
          label: document.returnNo,
          href: procurementViewUrl("return", document.publicId),
        },
        { label: "Edit" },
      ]}
      apiBasePath="/api/procurement/supplier-returns"
      cancelHref={procurementViewUrl("return", document.publicId)}
      successHref={procurementListUrl("return")}
      canEdit={document.status !== "POSTED" && document.status !== "CANCELLED"}
      suppliers={referenceData.suppliers}
      locations={referenceData.locations}
      grnOptions={receipts
        .filter((entry) => entry.status === "POSTED")
        .map((entry) => ({
          value: entry.id,
          label: `${entry.grnNo} - ${entry.supplierName}`,
        }))}
      initialValue={{
        returnDate: document.returnDate.slice(0, 10),
        supplierId: document.supplierId,
        grnId: document.grnId ?? "",
        returnLocationId: document.returnLocationId,
        reason: document.reason,
        remarks: document.remarks,
        items: document.items.map((item) => ({
          grnItemId: item.grnItemId ?? undefined,
          itemId: item.itemId,
          itemLabel: `${item.itemCode} - ${item.itemName}`,
          uomName: item.uomName ?? "",
          receivedQty: item.receivedQty ?? 0,
          previouslyReturnedQty: item.previouslyReturnedQty ?? 0,
          availableReturnQty: item.availableReturnQty ?? item.returnQty,
          returnQty: item.returnQty,
          unitCost: item.unitCost,
          reason: item.reason,
          remarks: item.remarks,
        })),
      }}
    />
  );
}

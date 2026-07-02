import { notFound } from "next/navigation";

import { getProcurementReferenceData } from "@/app/procurement/_lib/reference-data";
import { SupplierReturnEditor } from "@/features/procurement/supplier-return-pages";
import { listGoodsReceipts } from "@/services/procurement/grn.service";
import { getSupplierReturnById } from "@/services/procurement/supplier-return.service";

export default async function EditSupplierReturnPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [document, referenceData, receipts] = await Promise.all([
    getSupplierReturnById(id),
    getProcurementReferenceData(),
    listGoodsReceipts(),
  ]);

  if (!document) {
    notFound();
  }

  return (
    <SupplierReturnEditor
      documentId={document.id}
      title={`Edit ${document.returnNo}`}
      subtitle="Update the supplier return before posting it back through inventory."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Returns", href: "/procurement/supplier-returns" },
        { label: document.returnNo, href: `/procurement/supplier-returns/${document.id}` },
        { label: "Edit" },
      ]}
      apiBasePath="/api/procurement/supplier-returns"
      cancelHref={`/procurement/supplier-returns/${document.id}`}
      successHref="/procurement/supplier-returns"
      canEdit={document.status !== "POSTED" && document.status !== "CANCELLED"}
      suppliers={referenceData.suppliers}
      locations={referenceData.locations}
      approvers={referenceData.users}
      grnOptions={receipts.filter((entry) => entry.status === "POSTED").map((entry) => ({
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

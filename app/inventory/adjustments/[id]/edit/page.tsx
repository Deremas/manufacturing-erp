import { notFound } from "next/navigation";

import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getAdjustmentById } from "@/services/inventory/inventory-documents.service";

export default async function EditAdjustmentRoute(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [adjustment, referenceData] = await Promise.all([
    getAdjustmentById(id),
    getInventoryReferenceData(),
  ]);

  if (!adjustment) notFound();

  return (
    <InventoryDocumentEditor
      kind="adjustment"
      mode="edit"
      documentId={adjustment.id}
      title={`Edit ${adjustment.adjustmentNo}`}
      subtitle="Adjust the draft before posting it into the inventory ledger."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Adjustments", href: "/inventory/adjustments" },
        { label: adjustment.adjustmentNo, href: `/inventory/adjustments/${adjustment.id}` },
        { label: "Edit" },
      ]}
      apiBasePath="/api/inventory/adjustments"
      cancelHref={`/inventory/adjustments/${adjustment.id}`}
      successHref="/inventory/adjustments"
      canEdit={adjustment.status !== "POSTED" && adjustment.status !== "CANCELLED"}
      initialValue={{
        adjustmentDate: adjustment.adjustmentDate.slice(0, 10),
        locationId: adjustment.locationId,
        reason: adjustment.reason,
        approverId: adjustment.assignedApproverId ?? "",
        remarks: adjustment.remarks,
        items: adjustment.items,
      }}
      items={referenceData.items}
      locations={referenceData.locations}
    />
  );
}

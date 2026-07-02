import { notFound } from "next/navigation";

import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getTransferById } from "@/services/inventory/inventory-documents.service";

export default async function EditTransferRoute(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [transfer, referenceData] = await Promise.all([
    getTransferById(id),
    getInventoryReferenceData(),
  ]);

  if (!transfer) notFound();

  return (
    <InventoryDocumentEditor
      kind="transfer"
      mode="edit"
      documentId={transfer.id}
      title={`Edit ${transfer.transferNo}`}
      subtitle="Update the transfer before it is posted."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Transfers", href: "/inventory/transfers" },
        { label: transfer.transferNo, href: `/inventory/transfers/${transfer.id}` },
        { label: "Edit" },
      ]}
      apiBasePath="/api/inventory/transfers"
      cancelHref={`/inventory/transfers/${transfer.id}`}
      successHref="/inventory/transfers"
      canEdit={transfer.status !== "POSTED" && transfer.status !== "CANCELLED"}
      initialValue={{
        transferDate: transfer.transferDate.slice(0, 10),
        fromLocationId: transfer.fromLocationId,
        toLocationId: transfer.toLocationId,
        approverId: transfer.assignedApproverId ?? "",
        remarks: transfer.remarks,
        items: transfer.items,
      }}
      items={referenceData.items}
      locations={referenceData.locations}
    />
  );
}

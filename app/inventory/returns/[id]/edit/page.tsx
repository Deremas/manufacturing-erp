import { notFound } from "next/navigation";

import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { getReturnById } from "@/services/inventory/inventory-documents.service";

export default async function EditReturnRoute(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const [returnDoc, referenceData] = await Promise.all([
    getReturnById(id),
    getInventoryReferenceData(),
  ]);

  if (!returnDoc) notFound();

  return (
    <InventoryDocumentEditor
      kind="return"
      mode="edit"
      documentId={returnDoc.id}
      title={`Edit ${returnDoc.returnNo}`}
      subtitle="Update the stock return before posting it."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Returns", href: "/inventory/returns" },
        { label: returnDoc.returnNo, href: `/inventory/returns/${returnDoc.id}` },
        { label: "Edit" },
      ]}
      apiBasePath="/api/inventory/returns"
      cancelHref={`/inventory/returns/${returnDoc.id}`}
      successHref="/inventory/returns"
      canEdit={returnDoc.status !== "POSTED" && returnDoc.status !== "CANCELLED"}
      initialValue={{
        returnDate: returnDoc.returnDate.slice(0, 10),
        locationId: returnDoc.locationId,
        returnedFromType: returnDoc.returnedFromType,
        returnedFromId: returnDoc.returnedFromId,
        reason: returnDoc.reason,
        approverId: returnDoc.assignedApproverId ?? "",
        remarks: returnDoc.remarks,
        items: returnDoc.items,
      }}
      items={referenceData.items}
      locations={referenceData.locations}
      departments={referenceData.departments}
      users={referenceData.users}
    />
  );
}

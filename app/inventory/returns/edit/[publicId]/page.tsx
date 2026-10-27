import { notFound } from "next/navigation";

import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { formatStockReturnNumber } from "@/app/inventory/_lib/requisition-number";
import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { publicListUrl, publicViewUrl } from "@/lib/routing/urls";
import { getReturnById } from "@/services/inventory/inventory-documents.service";

const ROUTE_KEY = "inventory.return" as const;

export default async function ReturnEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [returnDoc, referenceData] = await Promise.all([
    getReturnById(publicId),
    getInventoryReferenceData(),
  ]);

  if (!returnDoc) notFound();

  return (
    <InventoryDocumentEditor
      kind="return"
      mode="edit"
      documentId={returnDoc.id}
      documentPublicId={returnDoc.publicId}
      routeKey={ROUTE_KEY}
      title={`Edit ${formatStockReturnNumber(returnDoc.returnNo)}`}
      subtitle="Update the stock return before posting it."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Returns", href: "/inventory/returns" },
        { label: formatStockReturnNumber(returnDoc.returnNo), href: publicViewUrl(ROUTE_KEY, returnDoc.publicId) },
        { label: "Edit" },
      ]}
      apiBasePath="/api/inventory/returns"
      cancelHref={publicViewUrl(ROUTE_KEY, returnDoc.publicId)}
      successHref={publicListUrl(ROUTE_KEY)}
      canEdit={returnDoc.status !== "POSTED" && returnDoc.status !== "CANCELLED"}
      initialValue={{
        returnNo: formatStockReturnNumber(returnDoc.returnNo),
        returnDate: returnDoc.returnDate.slice(0, 10),
        locationId: returnDoc.locationId,
        returnedFromType: returnDoc.returnedFromType,
        returnedFromId: returnDoc.returnedFromId,
        reason: returnDoc.reason,
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

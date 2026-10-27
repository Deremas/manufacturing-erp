import { notFound } from "next/navigation";

import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { publicListUrl, publicViewUrl } from "@/lib/routing/urls";
import { getAdjustmentById } from "@/services/inventory/inventory-documents.service";

const ROUTE_KEY = "inventory.adjustment" as const;

export default async function AdjustmentEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [adjustment, referenceData] = await Promise.all([
    getAdjustmentById(publicId),
    getInventoryReferenceData(),
  ]);

  if (!adjustment) notFound();

  return (
    <InventoryDocumentEditor
      kind="adjustment"
      mode="edit"
      documentId={adjustment.id}
      documentPublicId={adjustment.publicId}
      routeKey={ROUTE_KEY}
      title={`Edit ${adjustment.adjustmentNo}`}
      subtitle="Adjust the draft before posting it into the inventory ledger."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Adjustments", href: "/inventory/adjustments" },
        { label: adjustment.adjustmentNo, href: publicViewUrl(ROUTE_KEY, adjustment.publicId) },
        { label: "Edit" },
      ]}
      apiBasePath="/api/inventory/adjustments"
      cancelHref={publicViewUrl(ROUTE_KEY, adjustment.publicId)}
      successHref={publicListUrl(ROUTE_KEY)}
      canEdit={adjustment.status !== "POSTED" && adjustment.status !== "CANCELLED"}
      initialValue={{
        adjustmentNo: adjustment.adjustmentNo,
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

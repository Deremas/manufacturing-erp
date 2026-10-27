import { notFound } from "next/navigation";

import { getInventoryReferenceData } from "@/app/inventory/_lib/live-documents";
import { InventoryDocumentEditor } from "@/features/inventory/live/document-pages";
import { publicListUrl, publicViewUrl } from "@/lib/routing/urls";
import { getTransferById } from "@/services/inventory/inventory-documents.service";

const ROUTE_KEY = "inventory.transfer" as const;

export default async function TransferEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  const [transfer, referenceData] = await Promise.all([
    getTransferById(publicId),
    getInventoryReferenceData(),
  ]);

  if (!transfer) notFound();

  return (
    <InventoryDocumentEditor
      kind="transfer"
      mode="edit"
      documentId={transfer.id}
      documentPublicId={transfer.publicId}
      routeKey={ROUTE_KEY}
      title={`Edit ${transfer.transferNo}`}
      subtitle="Update the transfer before it is posted."
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Transfers", href: "/inventory/transfers" },
        { label: transfer.transferNo, href: publicViewUrl(ROUTE_KEY, transfer.publicId) },
        { label: "Edit" },
      ]}
      apiBasePath="/api/inventory/transfers"
      cancelHref={publicViewUrl(ROUTE_KEY, transfer.publicId)}
      successHref={publicListUrl(ROUTE_KEY)}
      canEdit={transfer.status !== "POSTED" && transfer.status !== "CANCELLED"}
      initialValue={{
        transferNo: transfer.transferNo,
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

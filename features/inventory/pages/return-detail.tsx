import { notFound } from "next/navigation";

import { formatStockReturnNumber } from "@/app/inventory/_lib/requisition-number";
import { InventoryDocumentDetail } from "@/features/inventory/live/document-pages";
import { publicEditUrl, publicViewUrl } from "@/lib/routing/urls";
import {
  getInventoryApprovalHistory,
  getInventoryAuditTrail,
  getInventoryDocumentHistory,
} from "@/services/inventory/inventory-insights.service";
import { getReturnById } from "@/services/inventory/inventory-documents.service";

const ROUTE_KEY = "inventory.return" as const;

export async function renderReturnDetail(documentKey: string) {
  const returnDoc = await getReturnById(documentKey);
  if (!returnDoc) notFound();

  const [approvalHistory, documentHistory, auditTrail] = await Promise.all([
    getInventoryApprovalHistory(ROUTE_KEY, returnDoc.id),
    getInventoryDocumentHistory(ROUTE_KEY, returnDoc.id),
    getInventoryAuditTrail(returnDoc.id, ROUTE_KEY),
  ]);

  const normalizedDocumentHistory = documentHistory.reduce<
    Array<{
      action: string;
      performedBy?: string;
      comment?: string;
      createdAt: string;
    }>
  >((rows, entry) => {
    const next = {
      action: entry.action,
      performedBy: entry.performedByName ?? undefined,
      comment: entry.comment ?? undefined,
      createdAt: entry.createdAt,
    };
    const duplicateIndex = rows.findIndex(
      (row) =>
        row.action === next.action &&
        row.createdAt === next.createdAt &&
        row.performedBy === next.performedBy,
    );
    if (duplicateIndex === -1) {
      rows.push(next);
      return rows;
    }

    if (!rows[duplicateIndex].comment && next.comment) {
      rows[duplicateIndex] = next;
    }
    return rows;
  }, []);

  return (
    <InventoryDocumentDetail
      compactHeader
      recordKind="inventory.return"
      title={`Return Voucher: ${formatStockReturnNumber(returnDoc.returnNo)}`}
      subtitle="Stock return detail"
      summaryTitle="Voucher Details"
      breadcrumbs={[
        { label: "Inventory", href: "/inventory" },
        { label: "Returns", href: "/inventory/returns" },
        { label: formatStockReturnNumber(returnDoc.returnNo) },
      ]}
      status={returnDoc.status}
      summary={[
        { label: "Return Date", value: new Date(returnDoc.returnDate).toLocaleDateString("en-KE") },
        { label: "Location", value: returnDoc.locationName },
        { label: "Returned From Type", value: returnDoc.returnedFromType.replaceAll("_", " ") },
        { label: "Returned From", value: returnDoc.returnedFromName },
        { label: "Status", value: returnDoc.status.replaceAll("_", " ") },
        { label: "Created By", value: returnDoc.createdByName },
        { label: "Remarks", value: returnDoc.remarks || "-" },
      ]}
      itemsTitle="Returned Items"
      items={returnDoc.items.map((item) => ({
        itemCode: item.itemCode,
        itemName: item.itemName,
        uom: item.uomName ?? "-",
        quantity: item.quantity,
        condition: item.condition || "Excess",
        remarks: item.remarks || "-",
      }))}
      itemColumns={[
        {
          key: "itemCode",
          label: "Item Code",
          width: 140,
          emphasis: true,
        },
        {
          key: "itemName",
          label: "Item Name",
          width: 260,
          wrap: true,
        },
        { key: "uom", label: "UOM", width: 70 },
        { key: "quantity", label: "Quantity", width: 80, align: "right", format: "qty" },
        { key: "condition", label: "Condition", width: 120 },
        { key: "remarks", label: "Remarks", width: 220, wrap: true },
      ]}
      approvalHistory={approvalHistory.map((entry) => ({
        status: entry.status,
        requestedBy: entry.requestedByName,
        assignedApprover: entry.assignedApproverName ?? undefined,
        approvedBy: entry.approvedByName ?? undefined,
        comment: entry.comment ?? undefined,
        createdAt: entry.createdAt,
      }))}
      documentHistory={normalizedDocumentHistory}
      auditTrail={auditTrail.map((entry) => ({
        action: entry.action,
        user: entry.userName ?? undefined,
        timestamp: entry.timestamp,
      }))}
      showAuditTrail={false}
      editHref={
        returnDoc.status === "POSTED" || returnDoc.status === "CANCELLED"
          ? undefined
          : publicEditUrl(ROUTE_KEY, returnDoc.publicId)
      }
      approveEndpoint={returnDoc.status === "SUBMITTED" ? `/api/inventory/returns/${returnDoc.id}/approve` : undefined}
      rejectEndpoint={returnDoc.status === "SUBMITTED" ? `/api/inventory/returns/${returnDoc.id}/reject` : undefined}
      cancelEndpoint={
        returnDoc.status === "DRAFT" || returnDoc.status === "SUBMITTED" || returnDoc.status === "APPROVED"
          ? `/api/inventory/returns/${returnDoc.id}/cancel`
          : undefined
      }
      postEndpoint={returnDoc.status === "APPROVED" ? `/api/inventory/returns/${returnDoc.id}/post` : undefined}
      afterActionHref={publicViewUrl(ROUTE_KEY, returnDoc.publicId)}
    />
  );
}

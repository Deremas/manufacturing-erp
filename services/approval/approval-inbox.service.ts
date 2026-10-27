import { sql } from "@/lib/db";
import { getApprovalReferenceMeta, resolveApprovalHref } from "@/lib/approval/reference-routing";
import { canApproveReference } from "@/lib/permissions/ui-access";

export type ApprovalInboxRow = {
  id: string;
  referenceType: string;
  referenceId: string;
  documentNo: string;
  documentLabel: string;
  requestedByName: string;
  assignedApproverName: string | null;
  createdAt: string;
  href: string;
};

export async function listApprovalInboxItems(
  permissions: string[],
  userId: string,
): Promise<ApprovalInboxRow[]> {
  try {
    const rows = await sql<Array<{
      id: string;
      referenceType: string;
      referenceId: string;
      requestedByName: string | null;
      assignedApproverId: string | null;
      assignedApproverName: string | null;
      createdAt: string;
      documentNo: string | null;
      documentPublicId: number | null;
    }>>`
      SELECT
        a.id,
        a."referenceType",
        a."referenceId",
        ru.name AS "requestedByName",
        a."assignedApproverId",
        su.name AS "assignedApproverName",
        a."createdAt"::text AS "createdAt",
        COALESCE(
          pr."requisitionNo",
          po."poNo",
          grn."grnNo",
          inv."invoiceNo",
          pay."paymentNo",
          sret."returnNo",
          st."transferNo",
          sadj."adjustmentNo",
          si."issueNo",
          sretn."returnNo",
          srv."requisitionNo"
        ) AS "documentNo",
        COALESCE(
          pr."publicId",
          po."publicId",
          grn."publicId",
          inv."publicId",
          pay."publicId",
          sret."publicId",
          st."publicId",
          sadj."publicId",
          si."publicId",
          sretn."publicId",
          srv."publicId"
        ) AS "documentPublicId"
      FROM "Approval" a
      INNER JOIN "User" ru ON ru.id = a."requestedById"
      LEFT JOIN "User" su ON su.id = a."assignedApproverId"
      LEFT JOIN "PurchaseRequisition" pr ON a."referenceType" = 'procurement.pr' AND pr.id = a."referenceId"
      LEFT JOIN "PurchaseOrder" po ON a."referenceType" = 'procurement.po' AND po.id = a."referenceId"
      LEFT JOIN "GoodsReceipt" grn ON a."referenceType" = 'procurement.grn' AND grn.id = a."referenceId"
      LEFT JOIN "SupplierInvoice" inv ON a."referenceType" = 'procurement.invoice' AND inv.id = a."referenceId"
      LEFT JOIN "SupplierPayment" pay ON a."referenceType" = 'procurement.payment' AND pay.id = a."referenceId"
      LEFT JOIN "SupplierReturn" sret ON a."referenceType" = 'procurement.supplier-return' AND sret.id = a."referenceId"
      LEFT JOIN "StockTransfer" st ON a."referenceType" = 'inventory.transfer' AND st.id = a."referenceId"
      LEFT JOIN "StockAdjustment" sadj ON a."referenceType" = 'inventory.adjustment' AND sadj.id = a."referenceId"
      LEFT JOIN "StockIssue" si ON a."referenceType" = 'inventory.issue' AND si.id = a."referenceId"
      LEFT JOIN "StockReturn" sretn ON a."referenceType" = 'inventory.return' AND sretn.id = a."referenceId"
      LEFT JOIN "StoreRequisition" srv ON a."referenceType" = 'inventory.requisition' AND srv.id = a."referenceId"
      WHERE a.status = 'PENDING'
        AND a."isArchived" = false
      ORDER BY a."createdAt" DESC
    `;

    const isSuper = permissions.includes("*");

    return rows
      .filter((row) => {
        if (!canApproveReference(permissions, row.referenceType)) return false;
        if (isSuper) return true;
        if (!row.assignedApproverId) return true;
        return row.assignedApproverId === userId;
      })
      .map((row) => {
        const meta = getApprovalReferenceMeta(row.referenceType);
        return {
          id: row.id,
          referenceType: row.referenceType,
          referenceId: row.referenceId,
          documentNo: row.documentNo ?? row.referenceId,
          documentLabel: meta.label,
          requestedByName: row.requestedByName ?? "Unknown",
          assignedApproverName: row.assignedApproverName,
          createdAt: row.createdAt,
          href: resolveApprovalHref(
            row.referenceType,
            row.documentPublicId ?? row.referenceId,
          ),
        };
      });
  } catch {
    return [];
  }
}

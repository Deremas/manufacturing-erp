import { sql } from "@/lib/db";
import { evaluateInventoryApprovalRequirement } from "@/services/inventory/inventory-policy.service";

export interface InventoryApprovalHistoryRow {
  id: string;
  status: string;
  requestedByName: string;
  assignedApproverName: string | null;
  approvedByName: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface InventoryDocumentHistoryRow {
  id: string;
  action: string;
  comment: string | null;
  performedByName: string | null;
  createdAt: string;
}

export interface InventoryAuditTrailRow {
  id: string;
  action: string;
  module: string;
  timestamp: string;
  userName: string | null;
}

export interface InventoryStockSnapshot {
  itemId: string;
  locationId: string;
  itemCode: string;
  itemName: string;
  locationName: string;
  uomName: string | null;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  averageCost: number;
  reorderPoint: number;
  status: "OUT_OF_STOCK" | "LOW_STOCK" | "NORMAL";
}

export interface InventoryReportRow {
  id: string;
  documentNo: string;
  documentDate: string;
  status: string;
  locationName: string | null;
  counterpartyName: string | null;
  itemCount: number;
  remarks: string | null;
}

export async function getInventoryApprovalHistory(referenceType: string, referenceId: string) {
  return sql<Array<InventoryApprovalHistoryRow>>`
    SELECT
      a.id,
      a.status,
      COALESCE(ru.name, a."requestedById") AS "requestedByName",
      assigned.name AS "assignedApproverName",
      approved.name AS "approvedByName",
      a.comment,
      a."createdAt"::text AS "createdAt",
      a."updatedAt"::text AS "updatedAt"
    FROM "Approval" a
    LEFT JOIN "User" ru ON ru.id = a."requestedById"
    LEFT JOIN "User" assigned ON assigned.id = a."assignedApproverId"
    LEFT JOIN "User" approved ON approved.id = a."approvedById"
    WHERE a."referenceType" = ${referenceType}
      AND a."referenceId" = ${referenceId}
      AND a."isArchived" = false
    ORDER BY a."createdAt" DESC
  `;
}

export async function getInventoryDocumentHistory(referenceType: string, referenceId: string) {
  return sql<Array<InventoryDocumentHistoryRow>>`
    SELECT
      dh.id,
      dh.action,
      dh.comment,
      u.name AS "performedByName",
      dh."createdAt"::text AS "createdAt"
    FROM "DocumentHistory" dh
    LEFT JOIN "User" u ON u.id = dh."performedById"
    WHERE dh."referenceType" = ${referenceType}
      AND dh."referenceId" = ${referenceId}
      AND dh."isArchived" = false
    ORDER BY dh."createdAt" DESC
  `;
}

export async function getInventoryAuditTrail(recordId: string, module: string) {
  return sql<Array<InventoryAuditTrailRow>>`
    SELECT
      al.id,
      al.action,
      al.module,
      al.timestamp::text AS timestamp,
      u.name AS "userName"
    FROM "AuditLog" al
    LEFT JOIN "User" u ON u.id = al."userId"
    WHERE al."recordId" = ${recordId}
      AND al.module = ${module}
      AND al."isArchived" = false
    ORDER BY al.timestamp DESC
  `;
}

export async function getInventoryStockSnapshot(itemId: string, locationId: string): Promise<InventoryStockSnapshot | null> {
  const rows = await sql<Array<InventoryStockSnapshot>>`
    SELECT
      sb."itemId",
      sb."locationId",
      i."itemCode",
      i."itemName",
      l."locationName",
      u.name AS "uomName",
      sb.quantity,
      sb."reservedQuantity",
      sb."availableQuantity",
      sb."averageCost",
      COALESCE(i."reorderPoint", 0) AS "reorderPoint",
      CASE
        WHEN sb.quantity <= 0 THEN 'OUT_OF_STOCK'
        WHEN sb."availableQuantity" <= COALESCE(i."reorderPoint", 0) THEN 'LOW_STOCK'
        ELSE 'NORMAL'
      END AS status
    FROM "StockBalance" sb
    INNER JOIN "Item" i ON i.id = sb."itemId"
    INNER JOIN "Location" l ON l.id = sb."locationId"
    LEFT JOIN "Unit" u ON u.id = i."uomId"
    WHERE sb."itemId" = ${itemId}
      AND sb."locationId" = ${locationId}
      AND sb."isArchived" = false
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function validateInventoryApprovalPolicy(input: {
  documentType: "transfer" | "adjustment" | "issue" | "return" | "requisition";
  status?: string;
  approverId?: string | null;
  fromLocationId?: string | null;
  createdById?: string | null;
  totalQuantity?: number;
  totalValue?: number;
}) {
  const normalizedStatus = String(input.status ?? "DRAFT").toUpperCase();
  if (normalizedStatus !== "SUBMITTED") {
    return;
  }

  const requirement = await evaluateInventoryApprovalRequirement({
    documentType: input.documentType,
    fromLocationId: input.fromLocationId,
    totalQuantity: input.totalQuantity,
    totalValue: input.totalValue,
    userId: input.createdById,
  });

  if (requirement.approvalRequired && !requirement.autoApprovedForAdmin && !input.approverId) {
    if (input.documentType === "transfer" && input.fromLocationId) {
      throw new Error("An approver is required before submitting a transfer from this location");
    }

    throw new Error(`An approver is required before submitting this ${input.documentType}`);
  }
}

export async function listInventoryReportRows(reportType: "transfers" | "adjustments" | "issues" | "returns" | "requisitions") {
  switch (reportType) {
    case "transfers":
      return sql<Array<InventoryReportRow>>`
        SELECT
          st.id,
          st."transferNo" AS "documentNo",
          st."transferDate"::text AS "documentDate",
          st.status,
          fl."locationName" AS "locationName",
          tl."locationName" AS "counterpartyName",
          COALESCE(COUNT(sti.id), 0)::int AS "itemCount",
          st.remarks
        FROM "StockTransfer" st
        INNER JOIN "Location" fl ON fl.id = st."fromLocationId"
        INNER JOIN "Location" tl ON tl.id = st."toLocationId"
        LEFT JOIN "StockTransferItem" sti ON sti."transferId" = st.id
        GROUP BY st.id, fl."locationName", tl."locationName"
        ORDER BY st."transferDate" DESC, st."createdAt" DESC
      `;
    case "adjustments":
      return sql<Array<InventoryReportRow>>`
        SELECT
          sa.id,
          sa."adjustmentNo" AS "documentNo",
          sa."adjustmentDate"::text AS "documentDate",
          sa.status,
          l."locationName" AS "locationName",
          sa.reason AS "counterpartyName",
          COALESCE(COUNT(sai.id), 0)::int AS "itemCount",
          sa.remarks
        FROM "StockAdjustment" sa
        INNER JOIN "Location" l ON l.id = sa."locationId"
        LEFT JOIN "StockAdjustmentItem" sai ON sai."adjustmentId" = sa.id
        GROUP BY sa.id, l."locationName"
        ORDER BY sa."adjustmentDate" DESC, sa."createdAt" DESC
      `;
    case "issues":
      return sql<Array<InventoryReportRow>>`
        SELECT
          si.id,
          si."issueNo" AS "documentNo",
          si."issueDate"::text AS "documentDate",
          si.status,
          l."locationName" AS "locationName",
          COALESCE(d.name, u2.name, si."issuedToId") AS "counterpartyName",
          COALESCE(COUNT(sii.id), 0)::int AS "itemCount",
          si.remarks
        FROM "StockIssue" si
        INNER JOIN "Location" l ON l.id = si."locationId"
        LEFT JOIN "Department" d ON d.id = si."issuedToId"
        LEFT JOIN "User" u2 ON u2.id = si."issuedToId"
        LEFT JOIN "StockIssueItem" sii ON sii."issueId" = si.id
        GROUP BY si.id, l."locationName", d.name, u2.name
        ORDER BY si."issueDate" DESC, si."createdAt" DESC
      `;
    case "returns":
      return sql<Array<InventoryReportRow>>`
        SELECT
          sr.id,
          sr."returnNo" AS "documentNo",
          sr."returnDate"::text AS "documentDate",
          sr.status,
          l."locationName" AS "locationName",
          COALESCE(d.name, u2.name, sr."returnedFromId") AS "counterpartyName",
          COALESCE(COUNT(sri.id), 0)::int AS "itemCount",
          sr.remarks
        FROM "StockReturn" sr
        INNER JOIN "Location" l ON l.id = sr."locationId"
        LEFT JOIN "Department" d ON d.id = sr."returnedFromId"
        LEFT JOIN "User" u2 ON u2.id = sr."returnedFromId"
        LEFT JOIN "StockReturnItem" sri ON sri."returnId" = sr.id
        GROUP BY sr.id, l."locationName", d.name, u2.name
        ORDER BY sr."returnDate" DESC, sr."createdAt" DESC
      `;
    case "requisitions":
      return sql<Array<InventoryReportRow>>`
        SELECT
          sr.id,
          sr."requisitionNo" AS "documentNo",
          sr."requisitionDate"::text AS "documentDate",
          sr.status,
          fl."locationName" AS "locationName",
          COALESCE(d.name, tl."locationName", u.name) AS "counterpartyName",
          COALESCE(COUNT(sri.id), 0)::int AS "itemCount",
          sr.remarks
        FROM "StoreRequisition" sr
        INNER JOIN "User" u ON u.id = sr."requestedById"
        LEFT JOIN "Location" fl ON fl.id = sr."fromLocationId"
        LEFT JOIN "Location" tl ON tl.id = sr."toLocationId"
        LEFT JOIN "Department" d ON d.id = sr."toDepartmentId"
        LEFT JOIN "StoreRequisitionItem" sri ON sri."requisitionId" = sr.id
        GROUP BY sr.id, fl."locationName", tl."locationName", d.name, u.name
        ORDER BY sr."requisitionDate" DESC, sr."createdAt" DESC
      `;
  }
}

import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/procurement/routes";
import {
  approveProcurementApproval,
  assertCanSubmitProcurementStatus,
  normalizeProcurementStatus,
  resolveProcurementDocumentNumber,
  rejectProcurementApproval,
  syncProcurementApproval,
  type ProcurementStatus,
  type Tx,
  writeProcurementAudit,
  writeProcurementHistory,
} from "@/services/procurement/procurement-shared.service";

export interface PurchaseRequisitionLineInput {
  itemId: string;
  uomId?: string | null;
  requestedQty?: number;
  approvedQty?: number;
  estimatedUnitPrice?: number;
  remarks?: string;
}

export interface PurchaseRequisitionSummary {
  id: string;
  publicId: number;
  requisitionNo: string;
  requisitionDate: string;
  departmentId: string | null;
  departmentName: string;
  locationId: string;
  locationName: string;
  requestedById: string;
  requestedByName: string;
  neededByDate: string | null;
  purpose: string;
  requestType: "INVENTORY_PURCHASE" | "MAINTENANCE_SPARE" | "ASSET_PURCHASE" | "EXTERNAL_SERVICE";
  status: ProcurementStatus;
  itemCount: number;
  estimatedTotal: number;
  remarks: string;
  canConvert?: boolean;
}

export interface PurchaseRequisitionDetail extends PurchaseRequisitionSummary {
  items: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    uomId: string | null;
    uomName: string | null;
    requestedQty: number;
    approvedQty: number;
    estimatedUnitPrice: number;
    estimatedTotal: number;
    remarks: string;
  }>;
  relatedPurchaseOrders: Array<{ id: string; publicId: number; poNo: string; status: string; supplierName: string; totalAmount: number }>;
}

interface PurchaseRequisitionPayload {
  requisitionDate: string;
  requestedById: string;
  departmentId?: string | null;
  locationId: string;
  neededByDate?: string | null;
  purpose: string;
  requestType?: PurchaseRequisitionSummary["requestType"];
  remarks?: string;
  status?: ProcurementStatus;
  requisitionNo?: string | null;
  approverId?: string | null;
  createdById: string;
  updatedById?: string | null;
  lineItems: PurchaseRequisitionLineInput[];
}

function validateItems(items: PurchaseRequisitionLineInput[]) {
  const valid = items.filter((item) => item.itemId && Number(item.requestedQty ?? 0) > 0);
  if (valid.length === 0) {
    throw new Error("At least one requisition item with quantity greater than zero is required");
  }

  return valid.map((item) => {
    const requestedQty = Number(item.requestedQty ?? 0);
    const rawApprovedQty = Number(item.approvedQty ?? 0);
    // 0 means "not set yet" for drafts; keep requested qty only when an approved qty was provided.
    const approvedQty = rawApprovedQty > 0 ? rawApprovedQty : 0;
    const estimatedUnitPrice = Number(item.estimatedUnitPrice ?? 0);
    return {
      ...item,
      requestedQty,
      approvedQty,
      estimatedUnitPrice,
      estimatedTotal: requestedQty * estimatedUnitPrice,
    };
  });
}

function validateHeader(payload: PurchaseRequisitionPayload) {
  if (!String(payload.requisitionDate ?? "").trim()) {
    throw new Error("PR date is required");
  }
  if (!String(payload.locationId ?? "").trim()) {
    throw new Error("Receiving location is required");
  }
}

async function writeItems(tx: Tx, requisitionId: string, items: ReturnType<typeof validateItems>) {
  for (const item of items) {
    await tx`
      INSERT INTO "PurchaseRequisitionItem" (
        id, "requisitionId", "itemId", "uomId", "requestedQty", "approvedQty", "estimatedUnitPrice", "estimatedTotal", remarks
      )
      VALUES (
        ${randomUUID()},
        ${requisitionId},
        ${item.itemId},
        ${item.uomId ?? null},
        ${item.requestedQty},
        ${item.approvedQty},
        ${item.estimatedUnitPrice},
        ${item.estimatedTotal},
        ${item.remarks ?? null}
      )
    `;
  }
}

export async function listPurchaseRequisitions(): Promise<PurchaseRequisitionSummary[]> {
  try {
    return await sql<Array<PurchaseRequisitionSummary>>`
      SELECT
        pr.id,
        pr."publicId",
        pr."requisitionNo",
        pr."requisitionDate"::text,
        pr."departmentId",
        COALESCE(d.name, '') AS "departmentName",
        pr."locationId",
        l."locationName" AS "locationName",
        pr."requestedById",
        u.name AS "requestedByName",
        pr."neededByDate"::text AS "neededByDate",
        pr.purpose,
        pr."requestType",
        pr.status,
        COALESCE(COUNT(pri.id), 0)::int AS "itemCount",
        COALESCE(SUM(pri."estimatedTotal"), 0)::double precision AS "estimatedTotal",
        COALESCE(pr.remarks, '') AS remarks,
        (
          pr.status NOT IN ('CANCELLED', 'CLOSED', 'DRAFT', 'SUBMITTED', 'REJECTED')
          AND EXISTS (
            SELECT 1
            FROM "PurchaseRequisitionItem" pri2
            WHERE pri2."requisitionId" = pr.id
              AND GREATEST(
                COALESCE(NULLIF(pri2."approvedQty", 0), pri2."requestedQty")
                  - COALESCE((
                    SELECT SUM(poi."orderedQty")
                    FROM "PurchaseOrderItem" poi
                    INNER JOIN "PurchaseOrder" po ON po.id = poi."poId"
                    WHERE poi."prItemId" = pri2.id
                      AND po.status NOT IN ('CANCELLED', 'REJECTED')
                  ), 0),
                0
              ) > 0
          )
        ) AS "canConvert"
      FROM "PurchaseRequisition" pr
      LEFT JOIN "Department" d ON d.id = pr."departmentId"
      INNER JOIN "Location" l ON l.id = pr."locationId"
      INNER JOIN "User" u ON u.id = pr."requestedById"
      LEFT JOIN "PurchaseRequisitionItem" pri ON pri."requisitionId" = pr.id
      GROUP BY pr.id, d.name, l."locationName", u.name
      ORDER BY pr."requisitionDate" DESC, pr."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getPurchaseRequisitionById(key: string): Promise<PurchaseRequisitionDetail | null> {
  try {
    const rows = await sql<Array<PurchaseRequisitionSummary>>`
      SELECT
        pr.id,
        pr."publicId",
        pr."requisitionNo",
        pr."requisitionDate"::text,
        pr."departmentId",
        COALESCE(d.name, '') AS "departmentName",
        pr."locationId",
        l."locationName" AS "locationName",
        pr."requestedById",
        u.name AS "requestedByName",
        pr."neededByDate"::text AS "neededByDate",
        pr.purpose,
        pr."requestType",
        pr.status,
        COALESCE(COUNT(pri.id), 0)::int AS "itemCount",
        COALESCE(SUM(pri."estimatedTotal"), 0)::double precision AS "estimatedTotal",
        COALESCE(pr.remarks, '') AS remarks
      FROM "PurchaseRequisition" pr
      LEFT JOIN "Department" d ON d.id = pr."departmentId"
      INNER JOIN "Location" l ON l.id = pr."locationId"
      INNER JOIN "User" u ON u.id = pr."requestedById"
      LEFT JOIN "PurchaseRequisitionItem" pri ON pri."requisitionId" = pr.id
      WHERE ${isPublicIdParam(key) ? sql`pr."publicId" = ${Number(key)}` : sql`pr.id = ${key}`}
      GROUP BY pr.id, d.name, l."locationName", u.name
      LIMIT 1
    `;
    const header = rows[0];
    if (!header) return null;

    const [items, relatedPurchaseOrders] = await Promise.all([
      sql<PurchaseRequisitionDetail["items"]>`
        SELECT
          pri.id,
          pri."itemId",
          i."itemCode",
          i."itemName",
          pri."uomId",
          u.name AS "uomName",
          pri."requestedQty",
          pri."approvedQty",
          pri."estimatedUnitPrice",
          pri."estimatedTotal",
          COALESCE(pri.remarks, '') AS remarks
        FROM "PurchaseRequisitionItem" pri
        INNER JOIN "Item" i ON i.id = pri."itemId"
        LEFT JOIN "Unit" u ON u.id = pri."uomId"
        WHERE pri."requisitionId" = ${header.id}
        ORDER BY i."itemCode" ASC
      `,
      sql<PurchaseRequisitionDetail["relatedPurchaseOrders"]>`
        SELECT
          po.id,
          po."publicId",
          po."poNo",
          po.status,
          s.name AS "supplierName",
          po."totalAmount"
        FROM "PurchaseOrder" po
        INNER JOIN "Supplier" s ON s.id = po."supplierId"
        WHERE po."prId" = ${header.id}
        ORDER BY po."poDate" DESC
      `,
    ]);

    return { ...header, items, relatedPurchaseOrders };
  } catch {
    return null;
  }
}

export async function createPurchaseRequisition(payload: PurchaseRequisitionPayload) {
  validateHeader(payload);
  const items = validateItems(payload.lineItems);
  const status = normalizeProcurementStatus(payload.status);

  return sql.begin(async (tx) => {
    const id = randomUUID();
    const requisitionNo = await resolveProcurementDocumentNumber(tx, "PR", "Purchase Requisition", payload.requisitionNo, {
      isTaken: async (documentNo) => {
        const rows = await tx<Array<{ id: string }>>`
          SELECT id FROM "PurchaseRequisition" WHERE "requisitionNo" = ${documentNo} LIMIT 1
        `;
        return Boolean(rows[0]);
      },
    });

    const inserted = await tx<Array<{ publicId: number }>>`
      INSERT INTO "PurchaseRequisition" (
        id, "requisitionNo", "requisitionDate", "requestedById", "departmentId", "locationId",
        "neededByDate", purpose, "requestType", status, remarks, "createdById", "updatedById", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${requisitionNo},
        ${new Date(payload.requisitionDate)},
        ${payload.requestedById},
        ${String(payload.departmentId ?? "").trim() || null},
        ${payload.locationId},
        ${payload.neededByDate ? new Date(payload.neededByDate) : null},
        ${payload.purpose},
        ${payload.requestType ?? "INVENTORY_PURCHASE"},
        ${status},
        ${payload.remarks ?? null},
        ${payload.createdById},
        ${payload.updatedById ?? payload.createdById},
        NOW(),
        NOW()
      )
      RETURNING "publicId"
    `;

    await writeItems(tx, id, items);
    await syncProcurementApproval(tx, {
      referenceType: "procurement.pr",
      referenceId: id,
      documentType: "requisition",
      status,
      requestedById: payload.createdById,
      assignedApproverId: null,
      comment: payload.remarks,
    });
    await writeProcurementAudit(tx, payload.createdById, "procurement.pr", "CREATE", id, payload);
    await writeProcurementHistory(tx, "procurement.pr", id, "CREATE", payload.createdById, payload.remarks);
    return { id, requisitionNo, publicId: inserted[0]?.publicId };
  });
}

export async function updatePurchaseRequisition(id: string, payload: PurchaseRequisitionPayload) {
  validateHeader(payload);
  const items = validateItems(payload.lineItems);
  const status = normalizeProcurementStatus(payload.status);

  return sql.begin(async (tx) => {
    const currentRows = await tx<Array<{ status: ProcurementStatus; requisitionNo: string }>>`
      SELECT status, "requisitionNo"
      FROM "PurchaseRequisition"
      WHERE id = ${id}
      LIMIT 1
    `;
    const current = currentRows[0];
    if (!current) throw new Error("Purchase requisition not found");
    if (current.status === "CONVERTED" || current.status === "CANCELLED" || current.status === "CLOSED") {
      throw new Error("Converted, cancelled, or closed requisition cannot be edited");
    }

    const nextNo = String(payload.requisitionNo ?? current.requisitionNo).trim() || current.requisitionNo;
    if (nextNo !== current.requisitionNo) {
      const clash = await tx<Array<{ id: string }>>`
        SELECT id FROM "PurchaseRequisition" WHERE "requisitionNo" = ${nextNo} AND id <> ${id} LIMIT 1
      `;
      if (clash[0]) throw new Error("PR number already exists");
    }

    await tx`
      UPDATE "PurchaseRequisition"
      SET
        "requisitionNo" = ${nextNo},
        "requisitionDate" = ${new Date(payload.requisitionDate)},
        "requestedById" = ${payload.requestedById},
        "departmentId" = ${String(payload.departmentId ?? "").trim() || null},
        "locationId" = ${payload.locationId},
        "neededByDate" = ${payload.neededByDate ? new Date(payload.neededByDate) : null},
        purpose = ${payload.purpose},
        "requestType" = ${payload.requestType ?? "INVENTORY_PURCHASE"},
        status = ${status},
        remarks = ${payload.remarks ?? null},
        "updatedById" = ${payload.updatedById ?? payload.createdById},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await tx`DELETE FROM "PurchaseRequisitionItem" WHERE "requisitionId" = ${id}`;
    await writeItems(tx, id, items);
    await syncProcurementApproval(tx, {
      referenceType: "procurement.pr",
      referenceId: id,
      documentType: "requisition",
      status,
      requestedById: payload.createdById,
      assignedApproverId: null,
      comment: payload.remarks,
    });
    await writeProcurementAudit(tx, payload.createdById, "procurement.pr", "UPDATE", id, payload);
    await writeProcurementHistory(tx, "procurement.pr", id, "UPDATE", payload.createdById, payload.remarks);
    return { id };
  });
}

export async function approvePurchaseRequisition(id: string, userId: string, comment?: string) {
  const requisition = await getPurchaseRequisitionById(id);
  if (!requisition) throw new Error("Purchase requisition not found");
  await approveProcurementApproval("procurement.pr", id, userId, comment);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "PurchaseRequisition"
      SET status = 'APPROVED', "approvedById" = ${userId}, "approvedAt" = NOW(), "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await tx`
      UPDATE "PurchaseRequisitionItem"
      SET "approvedQty" = "requestedQty"
      WHERE "requisitionId" = ${id}
        AND COALESCE("approvedQty", 0) < "requestedQty"
    `;
    await writeProcurementAudit(tx, userId, "procurement.pr", "APPROVE", id, { id, comment });
    await writeProcurementHistory(tx, "procurement.pr", id, "APPROVE", userId, comment ?? requisition.requisitionNo);
  });
  return { id };
}

export async function rejectPurchaseRequisition(id: string, userId: string, rejectionReason?: string) {
  const requisition = await getPurchaseRequisitionById(id);
  if (!requisition) throw new Error("Purchase requisition not found");
  await rejectProcurementApproval("procurement.pr", id, userId, rejectionReason);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "PurchaseRequisition"
      SET status = 'REJECTED', "rejectedById" = ${userId}, "rejectedAt" = NOW(), "rejectionReason" = ${rejectionReason ?? null}, "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await writeProcurementAudit(tx, userId, "procurement.pr", "REJECT", id, { id, rejectionReason });
    await writeProcurementHistory(tx, "procurement.pr", id, "REJECT", userId, rejectionReason ?? requisition.requisitionNo);
  });
  return { id };
}

export async function cancelPurchaseRequisition(id: string, userId: string) {
  const requisition = await getPurchaseRequisitionById(id);
  if (!requisition) throw new Error("Purchase requisition not found");
  if (requisition.status === "CONVERTED" || requisition.status === "CLOSED") {
    throw new Error("Converted or closed requisition cannot be cancelled");
  }
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "PurchaseRequisition"
      SET status = 'CANCELLED', "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await syncProcurementApproval(tx, {
      referenceType: "procurement.pr",
      referenceId: id,
      documentType: "requisition",
      status: "CANCELLED",
      requestedById: requisition.requestedById,
    });
    await writeProcurementAudit(tx, userId, "procurement.pr", "CANCEL", id, { id });
    await writeProcurementHistory(tx, "procurement.pr", id, "CANCEL", userId, requisition.requisitionNo);
  });
  return { id };
}

export async function submitPurchaseRequisition(
  id: string,
  userId: string,
  input?: { approverId?: string; comment?: string },
) {
  const requisition = await getPurchaseRequisitionById(id);
  if (!requisition) throw new Error("Purchase requisition not found");
  assertCanSubmitProcurementStatus(requisition.status);
  await sql.begin(async (tx) => {
    await tx`
      UPDATE "PurchaseRequisition"
      SET status = 'SUBMITTED', "updatedById" = ${userId}, "updatedAt" = NOW()
      WHERE id = ${id}
    `;
    await syncProcurementApproval(tx, {
      referenceType: "procurement.pr",
      referenceId: id,
      documentType: "requisition",
      status: "SUBMITTED",
      requestedById: requisition.requestedById || userId,
      assignedApproverId: null,
      comment: input?.comment,
    });
    await writeProcurementAudit(tx, userId, "procurement.pr", "SUBMIT", id, { id, ...input });
    await writeProcurementHistory(tx, "procurement.pr", id, "SUBMIT", userId, input?.comment ?? requisition.requisitionNo);
  });
  return { id };
}

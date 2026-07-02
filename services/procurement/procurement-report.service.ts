import { sql } from "@/lib/db";

export interface SupplierPerformanceRow {
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  totalPurchaseOrders: number;
  totalOrderedValue: number;
  totalReceivedValue: number;
  totalReturnedValue: number;
  outstandingPayable: number;
  averageLeadTimeDays: number;
  onTimeReceiptRate: number;
  acceptanceRate: number;
}

export interface CommitmentRegisterRow {
  poId: string;
  poNo: string;
  poDate: string;
  supplierName: string;
  deliveryLocationName: string;
  expectedDeliveryDate: string | null;
  status: string;
  totalAmount: number;
  receivedValue: number;
  invoicedAmount: number;
  paidAmount: number;
  outstandingCommitment: number;
  outstandingPayable: number;
}

export async function getSupplierPerformanceReport(): Promise<SupplierPerformanceRow[]> {
  try {
    const rows = await sql<Array<SupplierPerformanceRow>>`
      WITH po AS (
        SELECT
          p."supplierId",
          COUNT(*)::int AS "totalPurchaseOrders",
          COALESCE(SUM(p."totalAmount"), 0)::double precision AS "totalOrderedValue"
        FROM "PurchaseOrder" p
        WHERE p.status <> 'CANCELLED'
        GROUP BY p."supplierId"
      ),
      receipt_values AS (
        SELECT
          gr."supplierId",
          COALESCE(SUM(gri."acceptedQty" * gri."unitCost" + COALESCE(gri."taxAmount", 0)), 0)::double precision AS "totalReceivedValue",
          AVG(
            CASE
              WHEN po."poDate" IS NOT NULL THEN EXTRACT(EPOCH FROM (gr."grnDate" - po."poDate")) / 86400.0
              ELSE NULL
            END
          )::double precision AS "averageLeadTimeDays",
          AVG(
            CASE
              WHEN po."expectedDeliveryDate" IS NOT NULL AND gr."grnDate" <= po."expectedDeliveryDate" THEN 100.0
              WHEN po."expectedDeliveryDate" IS NOT NULL THEN 0.0
              ELSE NULL
            END
          )::double precision AS "onTimeReceiptRate",
          CASE
            WHEN SUM(COALESCE(gri."receivedQty", 0)) > 0
              THEN (SUM(COALESCE(gri."acceptedQty", 0)) / SUM(COALESCE(gri."receivedQty", 0))) * 100.0
            ELSE 0
          END::double precision AS "acceptanceRate"
        FROM "GoodsReceipt" gr
        INNER JOIN "GoodsReceiptItem" gri ON gri."goodsReceiptId" = gr.id
        LEFT JOIN "PurchaseOrder" po ON po.id = gr."poId"
        WHERE gr.status = 'POSTED'
        GROUP BY gr."supplierId"
      ),
      returns AS (
        SELECT
          sr."supplierId",
          COALESCE(SUM(sr."totalAmount"), 0)::double precision AS "totalReturnedValue"
        FROM "SupplierReturn" sr
        WHERE sr.status = 'POSTED'
        GROUP BY sr."supplierId"
      ),
      balances AS (
        SELECT
          si."supplierId",
          COALESCE(SUM(si."balanceDue"), 0)::double precision AS "outstandingPayable"
        FROM "SupplierInvoice" si
        WHERE si.status <> 'CANCELLED'
        GROUP BY si."supplierId"
      )
      SELECT
        s.id AS "supplierId",
        s."supplierCode",
        s.name AS "supplierName",
        COALESCE(po."totalPurchaseOrders", 0)::int AS "totalPurchaseOrders",
        COALESCE(po."totalOrderedValue", 0)::double precision AS "totalOrderedValue",
        COALESCE(rv."totalReceivedValue", 0)::double precision AS "totalReceivedValue",
        COALESCE(rt."totalReturnedValue", 0)::double precision AS "totalReturnedValue",
        COALESCE(b."outstandingPayable", 0)::double precision AS "outstandingPayable",
        COALESCE(rv."averageLeadTimeDays", 0)::double precision AS "averageLeadTimeDays",
        COALESCE(rv."onTimeReceiptRate", 0)::double precision AS "onTimeReceiptRate",
        COALESCE(rv."acceptanceRate", 0)::double precision AS "acceptanceRate"
      FROM "Supplier" s
      LEFT JOIN po ON po."supplierId" = s.id
      LEFT JOIN receipt_values rv ON rv."supplierId" = s.id
      LEFT JOIN returns rt ON rt."supplierId" = s.id
      LEFT JOIN balances b ON b."supplierId" = s.id
      WHERE s."isArchived" = false
      ORDER BY COALESCE(po."totalOrderedValue", 0) DESC, s.name ASC
    `;

    return rows;
  } catch {
    return [];
  }
}

export async function getCommitmentRegister(): Promise<CommitmentRegisterRow[]> {
  try {
    const rows = await sql<Array<CommitmentRegisterRow>>`
      WITH received AS (
        SELECT
          po.id AS "poId",
          COALESCE(SUM(
            CASE
              WHEN COALESCE(poi."orderedQty", 0) > 0
                THEN (COALESCE(poi."receivedQty", 0) / poi."orderedQty") * COALESCE(poi."lineTotal", 0)
              ELSE 0
            END
          ), 0)::double precision AS "receivedValue"
        FROM "PurchaseOrder" po
        LEFT JOIN "PurchaseOrderItem" poi ON poi."poId" = po.id
        GROUP BY po.id
      ),
      invoiced AS (
        SELECT
          si."poId",
          COALESCE(SUM(si."totalAmount"), 0)::double precision AS "invoicedAmount",
          COALESCE(SUM(si."amountPaid"), 0)::double precision AS "paidAmount",
          COALESCE(SUM(si."balanceDue"), 0)::double precision AS "outstandingPayable"
        FROM "SupplierInvoice" si
        WHERE si."poId" IS NOT NULL
          AND si.status <> 'CANCELLED'
        GROUP BY si."poId"
      )
      SELECT
        po.id AS "poId",
        po."poNo",
        po."poDate"::text,
        s.name AS "supplierName",
        l."locationName" AS "deliveryLocationName",
        po."expectedDeliveryDate"::text AS "expectedDeliveryDate",
        po.status::text AS status,
        po."totalAmount",
        COALESCE(r."receivedValue", 0)::double precision AS "receivedValue",
        COALESCE(i."invoicedAmount", 0)::double precision AS "invoicedAmount",
        COALESCE(i."paidAmount", 0)::double precision AS "paidAmount",
        GREATEST(po."totalAmount" - COALESCE(r."receivedValue", 0), 0)::double precision AS "outstandingCommitment",
        COALESCE(i."outstandingPayable", 0)::double precision AS "outstandingPayable"
      FROM "PurchaseOrder" po
      INNER JOIN "Supplier" s ON s.id = po."supplierId"
      INNER JOIN "Location" l ON l.id = po."deliveryLocationId"
      LEFT JOIN received r ON r."poId" = po.id
      LEFT JOIN invoiced i ON i."poId" = po.id
      WHERE po.status <> 'CANCELLED'
      ORDER BY po."poDate" DESC, po."createdAt" DESC
    `;

    return rows;
  } catch {
    return [];
  }
}

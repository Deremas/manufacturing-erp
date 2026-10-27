import { sql } from "@/lib/db";
import type { Tx } from "@/services/sales/sales-shared.service";

type OrderProgressRow = {
  id: string;
  orderedQty: number;
  reservedQty: number;
  loadedQty: number;
  deliveredQty: number;
  dispatchedQty: number;
  invoicedQty: number;
  returnedQty: number;
  cancelledQty: number;
  unitPrice: number;
};

export async function syncSalesOrderProgress(
  tx: Tx | typeof sql,
  salesOrderId: string,
) {
  const rows = await tx<Array<OrderProgressRow>>`
    WITH loading AS (
      SELECT
        loi."salesOrderItemId" AS id,
        COALESCE(SUM(loi."reservedQty"), 0)::double precision AS "reservedQty",
        COALESCE(SUM(loi."issuedQty"), 0)::double precision AS "loadedQty"
      FROM "LoadingOrderItem" loi
      INNER JOIN "LoadingOrder" lo ON lo.id = loi."loadingOrderId"
      WHERE lo."salesOrderId" = ${salesOrderId}
        AND lo."isArchived" = false
        AND lo.status <> 'CANCELLED'
      GROUP BY loi."salesOrderItemId"
    ),
    delivered AS (
      SELECT
        si."salesOrderItemId" AS id,
        COALESCE(SUM(si.quantity), 0)::double precision AS "deliveredQty"
      FROM "SaleItem" si
      INNER JOIN "Sale" s ON s.id = si."saleId"
      WHERE s."salesOrderId" = ${salesOrderId}
        AND s."isArchived" = false
        AND COALESCE(si."salesOrderItemId", '') <> ''
      GROUP BY si."salesOrderItemId"
    ),
    returned AS (
      SELECT
        sri."salesOrderItemId" AS id,
        COALESCE(SUM(sri.quantity), 0)::double precision AS "returnedQty"
      FROM "SalesReturnItem" sri
      INNER JOIN "SalesReturn" sr ON sr.id = sri."returnId"
      WHERE sr."salesOrderId" = ${salesOrderId}
        AND sr."isArchived" = false
        AND COALESCE(sri."salesOrderItemId", '') <> ''
      GROUP BY sri."salesOrderItemId"
    ),
    dispatched AS (
      SELECT sdi."salesOrderItemId" AS id, COALESCE(SUM(sdi.quantity), 0)::double precision AS "dispatchedQty"
      FROM "SalesDispatchItem" sdi
      INNER JOIN "SalesDispatch" sd ON sd.id = sdi."dispatchId"
      WHERE sd."salesOrderId" = ${salesOrderId} AND sd."isArchived" = false AND sd.status <> 'CANCELLED'
      GROUP BY sdi."salesOrderItemId"
    ),
    invoiced AS (
      SELECT sii."salesOrderItemId" AS id, COALESCE(SUM(sii.quantity), 0)::double precision AS "invoicedQty"
      FROM "SalesInvoiceItem" sii
      INNER JOIN "SalesInvoice" si ON si.id = sii."invoiceId"
      WHERE si."salesOrderId" = ${salesOrderId} AND si."isArchived" = false AND si.status <> 'CANCELLED'
      GROUP BY sii."salesOrderItemId"
    )
    SELECT
      soi.id,
      soi."orderedQty",
      COALESCE(loading."reservedQty", 0) AS "reservedQty",
      COALESCE(loading."loadedQty", 0) AS "loadedQty",
      COALESCE(delivered."deliveredQty", 0) AS "deliveredQty",
      COALESCE(dispatched."dispatchedQty", 0) AS "dispatchedQty",
      COALESCE(invoiced."invoicedQty", 0) AS "invoicedQty",
      COALESCE(returned."returnedQty", 0) AS "returnedQty",
      COALESCE(soi."cancelledQty", 0) AS "cancelledQty",
      soi."unitPrice"
    FROM "SalesOrderItem" soi
    LEFT JOIN loading ON loading.id = soi.id
    LEFT JOIN delivered ON delivered.id = soi.id
    LEFT JOIN returned ON returned.id = soi.id
    LEFT JOIN dispatched ON dispatched.id = soi.id
    LEFT JOIN invoiced ON invoiced.id = soi.id
    WHERE soi."salesOrderId" = ${salesOrderId}
  `;

  for (const row of rows) {
    await tx`
      UPDATE "SalesOrderItem"
      SET
        "reservedQty" = ${row.reservedQty},
        "loadedQty" = ${row.loadedQty},
        "deliveredQty" = ${row.deliveredQty},
        "returnedQty" = ${row.returnedQty},
        "updatedAt" = NOW()
      WHERE id = ${row.id}
    `;
  }

  const totals = rows.reduce(
    (summary, row) => ({
      orderedQty: summary.orderedQty + Number(row.orderedQty ?? 0),
      reservedQty: summary.reservedQty + Number(row.reservedQty ?? 0),
      loadedQty: summary.loadedQty + Number(row.loadedQty ?? 0),
      deliveredQty: summary.deliveredQty + Number(row.deliveredQty ?? 0),
      dispatchedQty: summary.dispatchedQty + Number(row.dispatchedQty ?? 0),
      invoicedQty: summary.invoicedQty + Number(row.invoicedQty ?? 0),
      cancelledQty: summary.cancelledQty + Number(row.cancelledQty ?? 0),
      reservedAmount: summary.reservedAmount + Number(row.reservedQty ?? 0) * Number(row.unitPrice ?? 0),
      fulfilledAmount: summary.fulfilledAmount + Number(row.deliveredQty ?? 0) * Number(row.unitPrice ?? 0),
    }),
    {
      orderedQty: 0,
      reservedQty: 0,
      loadedQty: 0,
      deliveredQty: 0,
      dispatchedQty: 0,
      invoicedQty: 0,
      cancelledQty: 0,
      reservedAmount: 0,
      fulfilledAmount: 0,
    },
  );

  const headerRows = await tx<Array<{ status: string; approvalStatus: string }>>`
    SELECT status, "approvalStatus"
    FROM "SalesOrder"
    WHERE id = ${salesOrderId}
      AND "isArchived" = false
    LIMIT 1
  `;
  const header = headerRows[0];
  if (!header) {
    return;
  }

  let nextStatus = header.status;
  if (header.status !== "DRAFT" && header.status !== "PENDING_APPROVAL" && header.status !== "CANCELLED") {
    const netOrderedQty = Math.max(totals.orderedQty - totals.cancelledQty, 0);
    if (netOrderedQty > 0 && totals.invoicedQty >= netOrderedQty) {
      nextStatus = "INVOICED";
    } else if (totals.invoicedQty > 0) {
      nextStatus = "PARTIALLY_INVOICED";
    } else if (netOrderedQty > 0 && totals.dispatchedQty >= netOrderedQty) {
      nextStatus = "DISPATCHED";
    } else if (totals.dispatchedQty > 0) {
      nextStatus = "PARTIALLY_DISPATCHED";
    } else if (totals.loadedQty > 0 && totals.loadedQty >= netOrderedQty) {
      nextStatus = "LOADED";
    } else if (totals.loadedQty > 0) {
      nextStatus = "PARTIALLY_LOADED";
    } else if (totals.reservedQty > 0 && totals.reservedQty >= netOrderedQty) {
      nextStatus = "RESERVED";
    } else if (totals.reservedQty > 0) {
      nextStatus = "PARTIALLY_RESERVED";
    } else if (header.approvalStatus === "APPROVED" || header.approvalStatus === "NOT_REQUIRED") {
      nextStatus = "APPROVED";
    }
  }

  await tx`
    UPDATE "SalesOrder"
    SET
      "reservedAmount" = ${Number(totals.reservedAmount.toFixed(2))},
      "fulfilledAmount" = ${Number(totals.fulfilledAmount.toFixed(2))},
      status = ${nextStatus},
      "updatedAt" = NOW()
    WHERE id = ${salesOrderId}
  `;
}

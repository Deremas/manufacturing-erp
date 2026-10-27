import assert from "node:assert/strict";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import {
  cancelLoadingOrder,
  confirmLoadingOrderSale,
  createLoadingOrder,
  getLoadingOrderById,
} from "@/services/sales/loading-order.service";
import { getSaleById } from "@/services/sales/sales.service";

import {
  archiveSalesArtifacts,
  closeTestDatabase,
  createSalesTestContext,
} from "./_helpers";

after(closeTestDatabase);

async function getPriceListItemId(priceListId: string, itemId: string) {
  const rows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "PriceListItem"
    WHERE "priceListId" = ${priceListId}
      AND "itemId" = ${itemId}
      AND "isArchived" = false
    LIMIT 1
  `;

  if (!rows[0]) {
    throw new Error("Price list item not found for loading-order test");
  }

  return rows[0].id;
}

async function archiveLoadingArtifacts(loadingId: string) {
  await sql`
    UPDATE "StockReservation"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE "sourceType" = 'sales.loading'
      AND "sourceId" = ${loadingId}
  `;

  await sql`
    UPDATE "LoadingOrder"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE id = ${loadingId}
  `;
}

test("posted loading order reserves stock without reducing quantity", async () => {
  const context = await createSalesTestContext();
  const priceListItemId = await getPriceListItemId(context.priceListId, context.fgItemId);

  const created = await createLoadingOrder(
    {
      loadingDate: new Date().toISOString(),
      channel: "FACTORY",
      fromLocationId: context.factoryLocationId,
      status: "POSTED",
      lines: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          priceListId: context.priceListId,
          priceListItemId,
          quantity: 3,
          unitPrice: 155,
          lineTotal: 465,
        },
      ],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  const loading = await getLoadingOrderById(created.id);
  const balances = await sql<Array<{ quantity: number; reservedQuantity: number; availableQuantity: number }>>`
    SELECT quantity, "reservedQuantity", "availableQuantity"
    FROM "StockBalance"
    WHERE "itemId" = ${context.fgItemId}
      AND "locationId" = ${context.factoryLocationId}
    LIMIT 1
  `;

  assert.equal(created.status, "POSTED");
  assert.equal(loading?.status, "POSTED");
  assert.equal(loading?.items[0]?.reservedQty, 3);
  assert.equal(Number(balances[0]?.quantity ?? 0), 20);
  assert.equal(Number(balances[0]?.reservedQuantity ?? 0), 3);
  assert.equal(Number(balances[0]?.availableQuantity ?? 0), 17);

  await archiveLoadingArtifacts(created.id);
  await archiveSalesArtifacts(context);
});

test("cancelling loading order releases reserved stock", async () => {
  const context = await createSalesTestContext();
  const priceListItemId = await getPriceListItemId(context.priceListId, context.fgItemId);

  const created = await createLoadingOrder(
    {
      loadingDate: new Date().toISOString(),
      channel: "FACTORY",
      fromLocationId: context.factoryLocationId,
      status: "POSTED",
      lines: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          priceListId: context.priceListId,
          priceListItemId,
          quantity: 4,
          unitPrice: 155,
          lineTotal: 620,
        },
      ],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  await cancelLoadingOrder(created.id, "Test cancellation", {
    userId: context.userId,
    userName: context.userName,
  });

  const loading = await getLoadingOrderById(created.id);
  const balances = await sql<Array<{ quantity: number; reservedQuantity: number; availableQuantity: number }>>`
    SELECT quantity, "reservedQuantity", "availableQuantity"
    FROM "StockBalance"
    WHERE "itemId" = ${context.fgItemId}
      AND "locationId" = ${context.factoryLocationId}
    LIMIT 1
  `;

  assert.equal(loading?.status, "CANCELLED");
  assert.equal(Number(balances[0]?.quantity ?? 0), 20);
  assert.equal(Number(balances[0]?.reservedQuantity ?? 0), 0);
  assert.equal(Number(balances[0]?.availableQuantity ?? 0), 20);

  await archiveLoadingArtifacts(created.id);
  await archiveSalesArtifacts(context);
});

test("confirming loading order creates posted sale and issues reserved stock", async () => {
  const context = await createSalesTestContext();
  const priceListItemId = await getPriceListItemId(context.priceListId, context.fgItemId);

  const created = await createLoadingOrder(
    {
      loadingDate: new Date().toISOString(),
      channel: "FACTORY",
      fromLocationId: context.factoryLocationId,
      status: "POSTED",
      lines: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          priceListId: context.priceListId,
          priceListItemId,
          quantity: 4,
          unitPrice: 155,
          lineTotal: 620,
        },
      ],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  const confirmed = await confirmLoadingOrderSale(
    created.id,
    undefined,
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  const loading = await getLoadingOrderById(created.id);
  const sale = await getSaleById(confirmed.saleId);
  const balances = await sql<Array<{ quantity: number; reservedQuantity: number; availableQuantity: number }>>`
    SELECT quantity, "reservedQuantity", "availableQuantity"
    FROM "StockBalance"
    WHERE "itemId" = ${context.fgItemId}
      AND "locationId" = ${context.factoryLocationId}
    LIMIT 1
  `;

  assert.equal(loading?.status, "CONFIRMED");
  assert.equal(sale?.status, "POSTED");
  assert.equal(Number(sale?.items[0]?.unitPrice ?? 0), 155);
  assert.equal(Number(balances[0]?.quantity ?? 0), 16);
  assert.equal(Number(balances[0]?.reservedQuantity ?? 0), 0);
  assert.equal(Number(balances[0]?.availableQuantity ?? 0), 16);

  await archiveLoadingArtifacts(created.id);
  await archiveSalesArtifacts(context);
});

test("partial confirm keeps remaining stock reserved until later dispatch", async () => {
  const context = await createSalesTestContext();
  const priceListItemId = await getPriceListItemId(context.priceListId, context.fgItemId);

  const created = await createLoadingOrder(
    {
      loadingDate: new Date().toISOString(),
      channel: "FACTORY",
      fromLocationId: context.factoryLocationId,
      status: "POSTED",
      lines: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          priceListId: context.priceListId,
          priceListItemId,
          quantity: 5,
          unitPrice: 155,
          lineTotal: 775,
        },
      ],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  const loadingBefore = await getLoadingOrderById(created.id);
  const firstLine = loadingBefore?.items[0];
  assert.ok(firstLine);

  const confirmed = await confirmLoadingOrderSale(
    created.id,
    {
      lines: [{ loadingOrderItemId: firstLine.id, quantity: 2 }],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  const loading = await getLoadingOrderById(created.id);
  const sale = await getSaleById(confirmed.saleId);
  const balances = await sql<Array<{ quantity: number; reservedQuantity: number; availableQuantity: number }>>`
    SELECT quantity, "reservedQuantity", "availableQuantity"
    FROM "StockBalance"
    WHERE "itemId" = ${context.fgItemId}
      AND "locationId" = ${context.factoryLocationId}
    LIMIT 1
  `;

  assert.equal(loading?.status, "PARTIALLY_CONFIRMED");
  assert.equal(Number(loading?.items[0]?.issuedQty ?? 0), 2);
  assert.equal(Number(loading?.items[0]?.reservedQty ?? 0), 3);
  assert.equal(sale?.status, "POSTED");
  assert.equal(Number(sale?.items[0]?.quantity ?? 0), 2);
  assert.equal(Number(balances[0]?.quantity ?? 0), 18);
  assert.equal(Number(balances[0]?.reservedQuantity ?? 0), 3);
  assert.equal(Number(balances[0]?.availableQuantity ?? 0), 15);

  await archiveLoadingArtifacts(created.id);
  await archiveSalesArtifacts(context);
});

import assert from "node:assert/strict";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { createPostedSale, getSaleById } from "@/services/sales/sales.service";

import {
  archiveSalesArtifacts,
  closeTestDatabase,
  createSalesTestContext,
} from "./_helpers";

after(closeTestDatabase);

test("POS sale saves price snapshot and reduces inventory", async () => {
  const context = await createSalesTestContext();

  const created = await createPostedSale(
    {
      saleDate: new Date().toISOString(),
      locationId: context.factoryLocationId,
      paymentMethod: "CASH",
      lines: [
        {
          itemId: context.fgItemId,
          quantity: 3,
        },
      ],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  assert.ok(created.id);
  assert.equal(created.channel, "FACTORY");

  const sale = await getSaleById(created.id);
  assert.ok(sale);
  assert.equal(sale?.items.length, 1);
  assert.equal(sale?.items[0]?.quantity, 3);
  assert.equal(sale?.items[0]?.priceListId, context.priceListId);
  assert.ok(sale?.items[0]?.priceListItemId);
  assert.ok(sale?.items[0]?.inventoryMovementId);

  const balances = await sql<Array<{ availableQuantity: number }>>`
    SELECT "availableQuantity"
    FROM "StockBalance"
    WHERE "itemId" = ${context.fgItemId}
      AND "locationId" = ${context.factoryLocationId}
    LIMIT 1
  `;

  assert.equal(Number(balances[0]?.availableQuantity ?? 0), 17);

  await archiveSalesArtifacts(context);
});

test("quarantine stock cannot be sold", async () => {
  const context = await createSalesTestContext();
  await sql`UPDATE "Location" SET "isQcHoldLocation" = true WHERE id = ${context.factoryLocationId}`;
  try {
    await assert.rejects(() => createPostedSale(
      {
        saleDate: new Date().toISOString(),
        locationId: context.factoryLocationId,
        paymentMethod: "CASH",
        lines: [{ itemId: context.fgItemId, quantity: 1 }],
      },
      { userId: context.userId, userName: context.userName },
    ), /quarantine/i);
  } finally {
    await sql`UPDATE "Location" SET "isQcHoldLocation" = false WHERE id = ${context.factoryLocationId}`;
    await archiveSalesArtifacts(context);
  }
});

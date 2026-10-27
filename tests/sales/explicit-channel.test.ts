import assert from "node:assert/strict";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { postOpeningStock } from "@/services/inventory/inventory-posting.service";
import { createPriceList } from "@/services/master-data/priceListService";
import { createPostedSale, getSaleById } from "@/services/sales/sales.service";

import {
  archiveSalesArtifacts,
  closeTestDatabase,
  createSalesTestContext,
} from "./_helpers";

after(closeTestDatabase);

test("factory sale uses FACTORY pricing by default", async () => {
  const context = await createSalesTestContext();

  const created = await createPostedSale(
    {
      saleDate: new Date().toISOString(),
      locationId: context.factoryLocationId,
      paymentMethod: "CASH",
      lines: [{ itemId: context.fgItemId, quantity: 1 }],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  const sale = await getSaleById(created.id);
  assert.equal(created.channel, "FACTORY");
  assert.equal(sale?.channel, "FACTORY");
  assert.equal(Number(sale?.items[0]?.unitPrice ?? 0), 155);

  await archiveSalesArtifacts(context);
});

test("truck sale uses explicit TRUCK pricing snapshot", async () => {
  const context = await createSalesTestContext();

  await createPriceList(
    {
      code: `PL-TRUCK-${Date.now()}`,
      name: "Truck sales test list",
      channel: "TRUCK",
      currency: "ETB",
      effectiveFrom: new Date().toISOString(),
      isDefault: false,
      isActive: true,
      items: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          unitPrice: 177,
          minimumQty: 1,
          taxIncluded: false,
          isActive: true,
        },
      ],
    },
    context.userId,
    context.userName,
  );

  const created = await createPostedSale(
    {
      saleDate: new Date().toISOString(),
      locationId: context.factoryLocationId,
      channel: "TRUCK",
      paymentMethod: "CASH",
      lines: [{ itemId: context.fgItemId, quantity: 1 }],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  const sale = await getSaleById(created.id);
  assert.equal(created.channel, "TRUCK");
  assert.equal(sale?.channel, "TRUCK");
  assert.equal(Number(sale?.items[0]?.unitPrice ?? 0), 177);

  await archiveSalesArtifacts(context);
});

test("branch sale uses BRANCH pricing and branch stock location", async () => {
  const context = await createSalesTestContext();

  await createPriceList(
    {
      code: `PL-BRANCH-${Date.now()}`,
      name: "Branch sales test list",
      channel: "BRANCH",
      currency: "ETB",
      locationId: context.branchLocationId,
      effectiveFrom: new Date().toISOString(),
      isDefault: false,
      isActive: true,
      items: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          unitPrice: 199,
          minimumQty: 1,
          taxIncluded: false,
          isActive: true,
        },
      ],
    },
    context.userId,
    context.userName,
  );

  await postOpeningStock({
    itemId: context.fgItemId,
    locationId: context.branchLocationId,
    sourceModule: "sales.branch.test",
    sourceDocumentId: `branch-open-${Date.now()}`,
    qtyIn: 10,
    qtyOut: 0,
    unitCost: 40,
    remarks: "Branch test opening stock",
    createdById: context.userId,
  });

  const created = await createPostedSale(
    {
      saleDate: new Date().toISOString(),
      locationId: context.branchLocationId,
      paymentMethod: "CASH",
      lines: [{ itemId: context.fgItemId, quantity: 2 }],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  const sale = await getSaleById(created.id);
  assert.equal(created.channel, "BRANCH");
  assert.equal(sale?.channel, "BRANCH");
  assert.equal(Number(sale?.items[0]?.unitPrice ?? 0), 199);

  const balances = await sql<Array<{ availableQuantity: number }>>`
    SELECT "availableQuantity"
    FROM "StockBalance"
    WHERE "itemId" = ${context.fgItemId}
      AND "locationId" = ${context.branchLocationId}
    LIMIT 1
  `;

  assert.equal(Number(balances[0]?.availableQuantity ?? 0), 8);

  await archiveSalesArtifacts(context);
});

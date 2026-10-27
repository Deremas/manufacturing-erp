import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { getChannelSalesReport } from "@/services/sales/channel-sales-report.service";

import {
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
    throw new Error("Price list item not found for report test");
  }

  return rows[0].id;
}

test("channel sales report respects location scope and selected channel", async () => {
  const context = await createSalesTestContext();
  const factorySaleId = randomUUID();
  const branchSaleId = randomUUID();
  const factoryPriceListItemId = await getPriceListItemId(context.priceListId, context.fgItemId);

  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO "Sale" (
        id, "saleNo", "saleDate", channel, "locationId", status, subtotal, "taxAmount",
        "discountAmount", "totalAmount", "paymentStatus", "paymentMethod", "createdById",
        "postedById", "postedAt", "isArchived", "createdAt", "updatedAt"
      )
      VALUES
      (
        ${factorySaleId},
        ${`SALE-RPT-F-${Date.now()}`},
        NOW(),
        'FACTORY',
        ${context.factoryLocationId},
        'POSTED',
        155,
        0,
        0,
        155,
        'PAID',
        'CASH'::"PaymentMethod",
        ${context.userId},
        ${context.userId},
        NOW(),
        false,
        NOW(),
        NOW()
      ),
      (
        ${branchSaleId},
        ${`SALE-RPT-B-${Date.now()}`},
        NOW(),
        'BRANCH',
        ${context.branchLocationId},
        'POSTED',
        410,
        0,
        0,
        410,
        'PAID',
        'CASH'::"PaymentMethod",
        ${context.userId},
        ${context.userId},
        NOW(),
        false,
        NOW(),
        NOW()
      )
    `;

    await tx`
      INSERT INTO "SaleItem" (
        id, "saleId", "itemId", "unitId", "priceListId", "priceListItemId", quantity,
        "unitPrice", "lineTotal", "taxAmount", "discountAmount", remarks, "createdAt", "updatedAt"
      )
      VALUES
      (
        ${randomUUID()},
        ${factorySaleId},
        ${context.fgItemId},
        ${context.unitId},
        ${context.priceListId},
        ${factoryPriceListItemId},
        1,
        155,
        155,
        0,
        0,
        ${"Factory report row"},
        NOW(),
        NOW()
      ),
      (
        ${randomUUID()},
        ${branchSaleId},
        ${context.fgItemId},
        ${context.unitId},
        ${context.priceListId},
        ${factoryPriceListItemId},
        2,
        205,
        410,
        0,
        0,
        ${"Branch report row"},
        NOW(),
        NOW()
      )
    `;
  });

  const factoryScoped = await getChannelSalesReport({
    accessibleLocationIds: [context.factoryLocationId],
    channel: "FACTORY",
  });

  const branchScoped = await getChannelSalesReport({
    accessibleLocationIds: [context.branchLocationId],
    channel: "BRANCH",
  });

  const blockedBranchScope = await getChannelSalesReport({
    accessibleLocationIds: [context.factoryLocationId],
    channel: "BRANCH",
  });

  assert.equal(factoryScoped.rows.length, 1);
  assert.equal(factoryScoped.rows[0]?.channel, "FACTORY");
  assert.equal(factoryScoped.rows[0]?.location.includes("FACT"), true);

  assert.equal(branchScoped.rows.length, 1);
  assert.equal(branchScoped.rows[0]?.channel, "BRANCH");
  assert.equal(branchScoped.rows[0]?.totalQuantity, 2);

  assert.equal(blockedBranchScope.rows.length, 0);
  assert.equal(blockedBranchScope.totals.totalDocuments, 0);

  await sql`
    UPDATE "Sale"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE id IN (${factorySaleId}, ${branchSaleId})
  `;
});

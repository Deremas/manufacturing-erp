import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import {
  getChannelSummaryReport,
  getDailySalesReport,
  getProductSalesReport,
} from "@/services/sales/sales-report.service";

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
    throw new Error("Price list item not found for summary report test");
  }

  return rows[0].id;
}

test("daily, product, and channel sales reports respect location scope", async () => {
  const context = await createSalesTestContext();
  const priceListItemId = await getPriceListItemId(context.priceListId, context.fgItemId);
  const factorySaleId = randomUUID();
  const branchSaleId = randomUUID();
  const factorySaleNo = `SALE-SUM-F-${Date.now()}`;
  const branchSaleNo = `SALE-SUM-B-${Date.now()}`;

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
        ${factorySaleNo},
        NOW(),
        'FACTORY',
        ${context.factoryLocationId},
        'POSTED',
        310,
        0,
        0,
        310,
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
        ${branchSaleNo},
        NOW(),
        'BRANCH',
        ${context.branchLocationId},
        'POSTED',
        205,
        0,
        0,
        205,
        'UNPAID',
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
        ${priceListItemId},
        2,
        155,
        310,
        0,
        0,
        ${"Factory summary row"},
        NOW(),
        NOW()
      ),
      (
        ${randomUUID()},
        ${branchSaleId},
        ${context.fgItemId},
        ${context.unitId},
        ${context.priceListId},
        ${priceListItemId},
        1,
        205,
        205,
        0,
        0,
        ${"Branch summary row"},
        NOW(),
        NOW()
      )
    `;
  });

  const factoryDaily = await getDailySalesReport({
    accessibleLocationIds: [context.factoryLocationId],
  });
  const factoryProduct = await getProductSalesReport({
    accessibleLocationIds: [context.factoryLocationId],
  });
  const factoryChannel = await getChannelSummaryReport({
    accessibleLocationIds: [context.factoryLocationId],
  });

  assert.equal(factoryDaily.totals.totalDocuments, 1);
  assert.equal(factoryDaily.totals.totalQuantity, 2);
  assert.equal(factoryProduct.rows.length, 1);
  assert.equal(factoryProduct.rows[0]?.totalQuantity, 2);
  assert.equal(factoryChannel.rows.length, 1);
  assert.equal(factoryChannel.rows[0]?.channel, "FACTORY");
  assert.equal(factoryChannel.rows[0]?.totalValue, 310);

  await sql`
    UPDATE "Sale"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE id IN (${factorySaleId}, ${branchSaleId})
  `;
});

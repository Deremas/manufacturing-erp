import assert from "node:assert/strict";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { createPostedSale, createPostedSalesReturn, getSaleById } from "@/services/sales/sales.service";

import {
  archiveSalesArtifacts,
  closeTestDatabase,
  createSalesTestContext,
} from "./_helpers";

after(closeTestDatabase);

test("sales return increases inventory through sales return posting", async () => {
  const context = await createSalesTestContext();

  const sale = await createPostedSale(
    {
      saleDate: new Date().toISOString(),
      locationId: context.factoryLocationId,
      paymentMethod: "CASH",
      lines: [
        {
          itemId: context.fgItemId,
          quantity: 4,
        },
      ],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  const detail = await getSaleById(sale.id);
  const line = detail?.items[0];
  assert.ok(line);

  const returned = await createPostedSalesReturn(
    {
      saleId: sale.id,
      returnDate: new Date().toISOString(),
      locationId: context.factoryLocationId,
      reason: "Customer return",
      lines: [
        {
          saleItemId: line?.id,
          itemId: context.fgItemId,
          unitId: line?.unitId,
          quantity: 1,
          unitPrice: Number(line?.unitPrice ?? 0),
          reason: "Resalable return",
        },
      ],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  assert.ok(returned.id);

  const balanceRows = await sql<Array<{ availableQuantity: number }>>`
    SELECT "availableQuantity"
    FROM "StockBalance"
    WHERE "itemId" = ${context.fgItemId}
      AND "locationId" = ${context.factoryLocationId}
    LIMIT 1
  `;

  assert.equal(Number(balanceRows[0]?.availableQuantity ?? 0), 17);

  const financeRows = await sql<Array<{ amount: number; status: string; postingType: string }>>`
    SELECT amount, status, "postingType"
    FROM "SalesFinancePosting"
    WHERE "sourceType" = 'sales.return'
      AND "sourceId" = ${returned.id}
    LIMIT 1
  `;

  assert.equal(Number(financeRows[0]?.amount ?? 0), Number(line?.unitPrice ?? 0));
  assert.equal(financeRows[0]?.status, "POSTED");
  assert.equal(financeRows[0]?.postingType, "SALES_RETURN");

  const journalRows = await sql<Array<{ totalDebit: number; totalCredit: number; sourceType: string }>>`
    SELECT "totalDebit", "totalCredit", "sourceType"
    FROM "JournalEntry"
    WHERE "sourceType" = 'sales.return'
      AND "sourceId" = ${returned.id}
    LIMIT 1
  `;

  assert.equal(Number(journalRows[0]?.totalDebit ?? 0), Number(line?.unitPrice ?? 0));
  assert.equal(Number(journalRows[0]?.totalCredit ?? 0), Number(line?.unitPrice ?? 0));
  assert.equal(journalRows[0]?.sourceType, "sales.return");

  await archiveSalesArtifacts(context);
});

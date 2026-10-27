import assert from "node:assert/strict";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { createPostedSale } from "@/services/sales/sales.service";

import {
  archiveSalesArtifacts,
  closeTestDatabase,
  createSalesTestContext,
} from "./_helpers";

after(closeTestDatabase);

test("posted sale creates finance posting and balanced journal", async () => {
  const context = await createSalesTestContext();

  const created = await createPostedSale(
    {
      saleDate: new Date().toISOString(),
      locationId: context.factoryLocationId,
      paymentMethod: "CASH",
      lines: [
        {
          itemId: context.fgItemId,
          quantity: 2,
        },
      ],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  const financeRows = await sql<Array<{ amount: number; status: string }>>`
    SELECT amount, status
    FROM "SalesFinancePosting"
    WHERE "sourceType" = 'sales.sale'
      AND "sourceId" = ${created.id}
    LIMIT 1
  `;

  assert.equal(Number(financeRows[0]?.amount ?? 0), 310);
  assert.equal(financeRows[0]?.status, "POSTED");

  const journalRows = await sql<Array<{ totalDebit: number; totalCredit: number }>>`
    SELECT "totalDebit", "totalCredit"
    FROM "JournalEntry"
    WHERE "sourceType" = 'sales.sale'
      AND "sourceId" = ${created.id}
    LIMIT 1
  `;

  assert.equal(Number(journalRows[0]?.totalDebit ?? 0), 310);
  assert.equal(Number(journalRows[0]?.totalCredit ?? 0), 310);

  await archiveSalesArtifacts(context);
});

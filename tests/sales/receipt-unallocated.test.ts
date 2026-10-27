import assert from "node:assert/strict";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { createCustomerReceipt, getCustomerReceiptById } from "@/services/sales/accounts-receivable.service";

import { archiveSalesArtifacts, closeTestDatabase, createSalesTestContext, runWithTransientDbRetry } from "./_helpers";

after(closeTestDatabase);

test("customer receipt can remain unallocated and still posts finance", async () => {
  await runWithTransientDbRetry(async () => {
    const context = await createSalesTestContext();
    try {
      const receipt = await createCustomerReceipt(
        {
          receiptDate: new Date().toISOString(),
          customerId: context.customerId,
          locationId: context.factoryLocationId,
          paymentMethod: "BANK",
          bankAccountId: context.bankAccountId,
          amountReceived: 500,
          referenceNo: "UNALLOCATED-RECEIPT",
          allocations: [],
        },
        { userId: context.userId, userName: context.userName },
        { accessibleLocationIds: [context.factoryLocationId] },
      );

      const detail = await getCustomerReceiptById(receipt.id, {
        accessibleLocationIds: [context.factoryLocationId],
      });
      assert.equal(detail?.status, "POSTED");
      assert.equal(detail?.unappliedAmount, 500);
      assert.equal(detail?.allocations.length, 0);

      const financeRows = await sql<Array<{ status: string; amount: number }>>`
        SELECT status, amount
        FROM "SalesFinancePosting"
        WHERE "sourceType" = 'sales.receipt'
          AND "sourceId" = ${receipt.id}
        LIMIT 1
      `;
      assert.equal(financeRows[0]?.status, "POSTED");
      assert.equal(Number(financeRows[0]?.amount ?? 0), 500);
    } finally {
      await archiveSalesArtifacts(context);
    }
  });
});

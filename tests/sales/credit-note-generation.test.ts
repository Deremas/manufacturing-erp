import assert from "node:assert/strict";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { createPostedSale, createPostedSalesReturn, getSaleById } from "@/services/sales/sales.service";

import { archiveSalesArtifacts, closeTestDatabase, createSalesTestContext, runWithTransientDbRetry } from "./_helpers";

after(closeTestDatabase);

test("posted sales return generates a commercial credit note", async () => {
  await runWithTransientDbRetry(async () => {
    const context = await createSalesTestContext();

    try {
      const sale = await createPostedSale(
        {
          saleDate: new Date().toISOString(),
          locationId: context.factoryLocationId,
          paymentMethod: "CASH",
          lines: [{ itemId: context.fgItemId, quantity: 3 }],
        },
        { userId: context.userId, userName: context.userName },
      );

      const detail = await getSaleById(sale.id);
      const line = detail?.items[0];
      assert.ok(line);

      const salesReturn = await createPostedSalesReturn(
        {
          saleId: sale.id,
          returnDate: new Date().toISOString(),
          locationId: context.factoryLocationId,
          reason: "Customer return",
          lines: [{
            saleItemId: line.id,
            itemId: context.fgItemId,
            unitId: line.unitId,
            quantity: 1,
            unitPrice: Number(line.unitPrice),
            reason: "Commercial credit",
          }],
        },
        { userId: context.userId, userName: context.userName },
      );

      const creditRows = await sql<Array<{ creditNoteNo: string; status: string; totalAmount: number }>>`
        SELECT "creditNoteNo", status, "totalAmount"
        FROM "SalesCreditNote"
        WHERE "salesReturnId" = ${salesReturn.id}
        LIMIT 1
      `;

      assert.ok(creditRows[0]?.creditNoteNo);
      assert.equal(creditRows[0]?.status, "POSTED");
      assert.equal(Number(creditRows[0]?.totalAmount ?? 0), Number(line.unitPrice));
    } finally {
      await archiveSalesArtifacts(context);
    }
  });
});

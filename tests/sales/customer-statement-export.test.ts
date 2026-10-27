import assert from "node:assert/strict";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { createCustomerReceipt, getCustomerStatement } from "@/services/sales/accounts-receivable.service";
import { convertSalesOrderToInvoice, createSalesOrder } from "@/services/sales/sales-order.service";

import { archiveSalesArtifacts, closeTestDatabase, createSalesTestContext, runWithTransientDbRetry } from "./_helpers";

after(closeTestDatabase);

test("customer statement includes posted invoices and receipts for export-ready history", async () => {
  await runWithTransientDbRetry(async () => {
    const context = await createSalesTestContext();

    try {
      const order = await createSalesOrder(
        {
          customerId: context.customerId,
          channel: "FACTORY",
          locationId: context.factoryLocationId,
          requiredDeliveryDate: new Date().toISOString(),
          items: [{ itemId: context.fgItemId, quantity: 2 }],
        },
        { userId: context.userId, userName: context.userName },
      );

      const invoice = await convertSalesOrderToInvoice(
        order.id,
        {
          saleDate: new Date().toISOString(),
        },
        { userId: context.userId, userName: context.userName },
      );

      const invoiceRows = await sql<Array<{ id: string }>>`
        SELECT id
        FROM "SalesInvoice"
        WHERE id = ${invoice.id}
        LIMIT 1
      `;
      const invoiceId = invoiceRows[0]?.id;
      assert.ok(invoiceId);

      await createCustomerReceipt(
        {
          receiptDate: new Date().toISOString(),
          customerId: context.customerId,
          locationId: context.factoryLocationId,
          paymentMethod: "BANK",
          bankAccountId: context.bankAccountId,
          amountReceived: Number(order.totalAmount),
          allocations: [{ salesInvoiceId: invoiceId, amount: Number(order.totalAmount) }],
        },
        { userId: context.userId, userName: context.userName },
        { accessibleLocationIds: [context.factoryLocationId] },
      );

      const statement = await getCustomerStatement(context.customerId, {
        accessibleLocationIds: [context.factoryLocationId],
      });

      assert.ok(statement);
      assert.ok(statement?.entries.some((entry) => entry.entryType === "INVOICE"));
      assert.ok(statement?.entries.some((entry) => entry.entryType === "RECEIPT"));
      assert.equal(Number(statement?.outstandingBalance ?? 0), 0);
    } finally {
      await archiveSalesArtifacts(context);
    }
  });
});

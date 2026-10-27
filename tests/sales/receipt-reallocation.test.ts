import assert from "node:assert/strict";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { createCustomerReceipt, getCustomerStatement, listOpenSalesInvoices, updateCustomerReceipt } from "@/services/sales/accounts-receivable.service";
import { convertSalesOrderToInvoice, createSalesOrder } from "@/services/sales/sales-order.service";

import { archiveSalesArtifacts, closeTestDatabase, createSalesTestContext, runWithTransientDbRetry } from "./_helpers";

after(closeTestDatabase);

test("customer receipt reallocation updates invoice balances and keeps finance posting active", async () => {
  await runWithTransientDbRetry(async () => {
    const context = await createSalesTestContext();

    try {
      const firstOrder = await createSalesOrder(
        {
          customerId: context.customerId,
          channel: "FACTORY",
          locationId: context.factoryLocationId,
          requiredDeliveryDate: new Date().toISOString(),
          items: [{ itemId: context.fgItemId, quantity: 2 }],
        },
        { userId: context.userId, userName: context.userName },
      );

      const firstInvoiceSnapshot = await convertSalesOrderToInvoice(
        firstOrder.id,
        {
          saleDate: new Date().toISOString(),
        },
        { userId: context.userId, userName: context.userName },
      );

      const secondOrder = await createSalesOrder(
        {
          customerId: context.customerId,
          channel: "FACTORY",
          locationId: context.factoryLocationId,
          requiredDeliveryDate: new Date().toISOString(),
          items: [{ itemId: context.fgItemId, quantity: 1 }],
        },
        { userId: context.userId, userName: context.userName },
      );

      const secondInvoiceSnapshot = await convertSalesOrderToInvoice(
        secondOrder.id,
        {
          saleDate: new Date().toISOString(),
        },
        { userId: context.userId, userName: context.userName },
      );

      const targetInvoices = await listOpenSalesInvoices(
        { accessibleLocationIds: [context.factoryLocationId] },
        { includeInvoiceIds: [firstInvoiceSnapshot.id, secondInvoiceSnapshot.id] },
      );
      assert.equal(targetInvoices.length, 2);

      const firstInvoice = targetInvoices.find((invoice) => invoice.id === firstInvoiceSnapshot.id);
      const secondInvoice = targetInvoices.find((invoice) => invoice.id === secondInvoiceSnapshot.id);
      assert.ok(firstInvoice);
      assert.ok(secondInvoice);

      const receipt = await createCustomerReceipt(
        {
          receiptDate: new Date().toISOString(),
          customerId: context.customerId,
          locationId: context.factoryLocationId,
          paymentMethod: "BANK",
          bankAccountId: context.bankAccountId,
          amountReceived: Number(firstInvoice.balanceDue) + Number(secondInvoice.balanceDue),
          allocations: [
            { salesInvoiceId: firstInvoice.id, amount: Number(firstInvoice.balanceDue) },
            { salesInvoiceId: secondInvoice.id, amount: Number(secondInvoice.balanceDue) },
          ],
        },
        { userId: context.userId, userName: context.userName },
        { accessibleLocationIds: [context.factoryLocationId] },
      );

      await updateCustomerReceipt(
        receipt.id,
        {
          receiptDate: new Date().toISOString(),
          customerId: context.customerId,
          locationId: context.factoryLocationId,
          paymentMethod: "BANK",
          bankAccountId: context.bankAccountId,
          amountReceived: Number(firstInvoice.balanceDue),
          allocations: [
            { salesInvoiceId: firstInvoice.id, amount: Number(firstInvoice.balanceDue) },
          ],
        },
        { userId: context.userId, userName: context.userName },
        { accessibleLocationIds: [context.factoryLocationId] },
      );

      const reloadedInvoices = await listOpenSalesInvoices(
        { accessibleLocationIds: [context.factoryLocationId] },
        { includeInvoiceIds: [firstInvoice.id, secondInvoice.id] },
      );
      const firstInvoiceReloaded = reloadedInvoices.find((invoice) => invoice.id === firstInvoice.id);
      const secondInvoiceReloaded = reloadedInvoices.find((invoice) => invoice.id === secondInvoice.id);

      assert.equal(Number(firstInvoiceReloaded?.balanceDue ?? 0), 0);
      assert.equal(Number(secondInvoiceReloaded?.balanceDue ?? 0), Number(secondInvoice.balanceDue));

      const financeRows = await sql<Array<{ status: string; amount: number }>>`
        SELECT status, amount
        FROM "SalesFinancePosting"
        WHERE "sourceType" = 'sales.receipt'
          AND "sourceId" = ${receipt.id}
        LIMIT 1
      `;
      assert.equal(financeRows[0]?.status, "POSTED");
      assert.equal(Number(financeRows[0]?.amount ?? 0), Number(firstInvoice.balanceDue));

      const statement = await getCustomerStatement(context.customerId, { accessibleLocationIds: [context.factoryLocationId] });
      assert.ok(statement);
      assert.ok(statement?.entries.some((entry) => entry.entryType === "RECEIPT"));
    } finally {
      await archiveSalesArtifacts(context);
    }
  });
});

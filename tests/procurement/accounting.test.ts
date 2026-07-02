import assert from "node:assert/strict";
import { after, test } from "node:test";

import { getSuppliers } from "@/lib/master-data-db";
import { sql } from "@/lib/db";
import {
  approveSupplierInvoice,
  createSupplierInvoice,
} from "@/services/procurement/supplier-invoice.service";
import {
  approveSupplierPayment,
  createSupplierPayment,
} from "@/services/procurement/supplier-payment.service";

import {
  closeTestDatabase,
  createInventoryTestContext,
} from "../inventory/_helpers";

after(closeTestDatabase);

async function getJournalSummary(sourceType: string, sourceId: string) {
  const rows = await sql<Array<{ id: string; totalDebit: number; totalCredit: number; lineCount: number }>>`
    SELECT
      je.id,
      je."totalDebit",
      je."totalCredit",
      COUNT(jl.id)::int AS "lineCount"
    FROM "JournalEntry" je
    LEFT JOIN "JournalLine" jl ON jl."journalEntryId" = je.id
    WHERE je."sourceType" = ${sourceType}
      AND je."sourceId" = ${sourceId}
    GROUP BY je.id
    LIMIT 1
  `;

  return rows[0] ?? null;
}

test("approved supplier invoice creates balanced AP accrual journal entry", async () => {
  const context = await createInventoryTestContext();
  const suppliers = await getSuppliers();

  if (!suppliers[0]?.id) {
    throw new Error("Accounting invoice test requires at least one supplier");
  }

  const invoice = await createSupplierInvoice({
    supplierInvoiceNo: `TEST-JRN-INV-${Date.now()}`,
    invoiceDate: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    supplierId: suppliers[0].id,
    remarks: "journal entry accrual test",
    status: "SUBMITTED",
    recordedById: context.adminUserId,
    lineItems: [{
      itemId: context.itemId,
      quantity: 5,
      unitPrice: 10,
      taxAmount: 0,
    }],
  });

  await approveSupplierInvoice(invoice.id, context.adminUserId);

  const summary = await getJournalSummary("procurement.invoice", invoice.id);

  assert.ok(summary);
  assert.equal(Number(summary.totalDebit ?? 0), 50);
  assert.equal(Number(summary.totalCredit ?? 0), 50);
  assert.equal(Number(summary.lineCount ?? 0), 2);
});

test("approved supplier payment creates balanced AP settlement journal entry", async () => {
  const context = await createInventoryTestContext();
  const suppliers = await getSuppliers();
  const bankRows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "BankAccount"
    WHERE "isArchived" = false
      AND "isActive" = true
    ORDER BY "createdAt" ASC
    LIMIT 1
  `;

  if (!suppliers[0]?.id) {
    throw new Error("Accounting payment test requires at least one supplier");
  }
  if (!bankRows[0]?.id) {
    throw new Error("Accounting payment test requires at least one active bank account");
  }

  const invoice = await createSupplierInvoice({
    supplierInvoiceNo: `TEST-JRN-PAY-${Date.now()}`,
    invoiceDate: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    supplierId: suppliers[0].id,
    remarks: "journal entry settlement test",
    status: "SUBMITTED",
    recordedById: context.adminUserId,
    lineItems: [{
      itemId: context.itemId,
      quantity: 4,
      unitPrice: 10,
      taxAmount: 0,
    }],
  });

  await approveSupplierInvoice(invoice.id, context.adminUserId);

  const payment = await createSupplierPayment({
    paymentDate: new Date().toISOString(),
    supplierId: suppliers[0].id,
    invoiceId: invoice.id,
    paymentMethod: "BANK",
    bankAccountId: bankRows[0].id,
    referenceNo: `JRN-PAY-${Date.now()}`,
    amount: 40,
    remarks: "journal entry payment test",
    status: "SUBMITTED",
    createdById: context.adminUserId,
  });

  await approveSupplierPayment(payment.id, context.adminUserId);

  const summary = await getJournalSummary("procurement.payment", payment.id);

  assert.ok(summary);
  assert.equal(Number(summary.totalDebit ?? 0), 40);
  assert.equal(Number(summary.totalCredit ?? 0), 40);
  assert.equal(Number(summary.lineCount ?? 0), 2);
});

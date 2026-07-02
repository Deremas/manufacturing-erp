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
  getSupplierPaymentById,
} from "@/services/procurement/supplier-payment.service";

import {
  closeTestDatabase,
  createInventoryTestContext,
} from "../inventory/_helpers";

after(closeTestDatabase);

async function countFinancePostings(sourceType: string, sourceId: string) {
  const rows = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "ProcurementFinancePosting"
    WHERE "sourceType" = ${sourceType}
      AND "sourceId" = ${sourceId}
  `;
  return rows[0]?.count ?? 0;
}

async function getFinancePosting(sourceType: string, sourceId: string) {
  const rows = await sql<Array<{ amount: number; bankAccountId: string | null; postingType: string; status: string }>>`
    SELECT amount, "bankAccountId", "postingType", status
    FROM "ProcurementFinancePosting"
    WHERE "sourceType" = ${sourceType}
      AND "sourceId" = ${sourceId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

test("approved supplier invoice creates finance payable posting", async () => {
  const context = await createInventoryTestContext();
  const suppliers = await getSuppliers();

  if (!suppliers[0]?.id) {
    throw new Error("Supplier invoice test requires at least one supplier");
  }

  const invoice = await createSupplierInvoice({
    supplierInvoiceNo: `TEST-SINV-${Date.now()}`,
    invoiceDate: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    supplierId: suppliers[0].id,
    remarks: "supplier invoice finance posting test",
    status: "SUBMITTED",
    recordedById: context.adminUserId,
    lineItems: [{
      itemId: context.itemId,
      quantity: 3,
      unitPrice: 17,
      taxAmount: 2,
    }],
  });

  await approveSupplierInvoice(invoice.id, context.adminUserId);

  assert.equal(await countFinancePostings("procurement.invoice", invoice.id), 1);
});

test("approved supplier payment updates invoice balance and creates finance payment posting", async () => {
  const context = await createInventoryTestContext();
  const suppliers = await getSuppliers();
  const bankRows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "BankAccount"
    WHERE "isArchived" = false AND "isActive" = true
    ORDER BY "createdAt" ASC
    LIMIT 1
  `;

  if (!suppliers[0]?.id) {
    throw new Error("Supplier payment test requires at least one supplier");
  }
  if (!bankRows[0]?.id) {
    throw new Error("Supplier payment test requires at least one active bank account");
  }

  const invoice = await createSupplierInvoice({
    supplierInvoiceNo: `TEST-SPAY-${Date.now()}`,
    invoiceDate: new Date().toISOString(),
    dueDate: new Date().toISOString(),
    supplierId: suppliers[0].id,
    remarks: "supplier payment finance posting test",
    status: "SUBMITTED",
    recordedById: context.adminUserId,
    lineItems: [{
      itemId: context.itemId,
      quantity: 4,
      unitPrice: 20,
      taxAmount: 0,
    }],
  });
  await approveSupplierInvoice(invoice.id, context.adminUserId);

  const invoiceRowsBefore = await sql<Array<{ balanceDue: number }>>`
    SELECT "balanceDue"
    FROM "SupplierInvoice"
    WHERE id = ${invoice.id}
    LIMIT 1
  `;
  const balanceDue = Number(invoiceRowsBefore[0]?.balanceDue ?? 0);

  const payment = await createSupplierPayment({
    paymentDate: new Date().toISOString(),
    supplierId: suppliers[0].id,
    invoiceId: invoice.id,
    paymentMethod: "BANK",
    bankAccountId: bankRows[0].id,
    referenceNo: `PAY-${Date.now()}`,
    amount: balanceDue / 2,
    remarks: "supplier payment approval test",
    status: "SUBMITTED",
    createdById: context.adminUserId,
  });

  await approveSupplierPayment(payment.id, context.adminUserId);

  const paymentDetail = await getSupplierPaymentById(payment.id);
  const financePosting = await getFinancePosting("procurement.payment", payment.id);
  const invoiceRowsAfter = await sql<Array<{ amountPaid: number; balanceDue: number; status: string }>>`
    SELECT "amountPaid", "balanceDue", status
    FROM "SupplierInvoice"
    WHERE id = ${invoice.id}
    LIMIT 1
  `;

  assert.ok(paymentDetail);
  assert.ok(financePosting);
  assert.equal(await countFinancePostings("procurement.payment", payment.id), 1);
  assert.equal(Number(invoiceRowsAfter[0]?.amountPaid ?? 0), balanceDue / 2);
  assert.equal(Number(invoiceRowsAfter[0]?.balanceDue ?? 0), balanceDue / 2);
  assert.equal(String(invoiceRowsAfter[0]?.status ?? ""), "PARTIAL_PAID");
  assert.equal(Number(financePosting?.amount ?? 0), balanceDue / 2);
  assert.equal(financePosting?.bankAccountId, bankRows[0].id);
  assert.equal(String(financePosting?.postingType ?? ""), "SUPPLIER_PAYMENT");
  assert.equal(String(financePosting?.status ?? ""), "POSTED");
});

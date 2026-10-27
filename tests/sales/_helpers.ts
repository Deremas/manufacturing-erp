import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { postOpeningStock } from "@/services/inventory/inventory-posting.service";
import { createPriceList } from "@/services/master-data/priceListService";
import { runWithTransientDbRetry } from "@/tests/_db-test-utils";
import {
  archivePricingArtifacts,
  closeTestDatabase,
  createPricingTestContext,
  type PricingTestContext,
} from "@/tests/pricing/_helpers";

export interface SalesTestContext extends PricingTestContext {
  priceListId: string;
}

export async function createSalesTestContext(): Promise<SalesTestContext> {
  return runWithTransientDbRetry(async () => {
    const context = await createPricingTestContext();
    const codeSuffix = `${Date.now().toString().slice(-4)}${randomUUID().slice(0, 4).toUpperCase()}`;

    const priceList = await createPriceList(
      {
        code: `PL-SALES-${codeSuffix}`,
        name: "Sales test list",
        channel: "FACTORY",
        currency: "ETB",
        effectiveFrom: new Date().toISOString(),
        isDefault: false,
        isActive: true,
        items: [
          {
            itemId: context.fgItemId,
            unitId: context.unitId,
            unitPrice: 155,
            minimumQty: 1,
            taxIncluded: false,
            isActive: true,
          },
        ],
      },
      context.userId,
      context.userName,
    );

    await postOpeningStock({
      itemId: context.fgItemId,
      locationId: context.factoryLocationId,
      sourceModule: "sales.test",
      sourceDocumentId: `sales-open-${randomUUID()}`,
      qtyIn: 20,
      qtyOut: 0,
      unitCost: 40,
      remarks: "Sales test opening stock",
      createdById: context.userId,
    });

    return {
      ...context,
      priceListId: priceList.id,
    };
  });
}

export async function archiveSalesArtifacts(context: SalesTestContext) {
  await sql`
    UPDATE "CustomerReceipt"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE "customerId" = ${context.customerId}
       OR id IN (
         SELECT cra."receiptId"
         FROM "CustomerReceiptAllocation" cra
         INNER JOIN "SalesInvoice" si ON si.id = cra."salesInvoiceId"
         WHERE si."customerId" = ${context.customerId}
       )
  `;

  await sql`
    UPDATE "SalesCreditNote"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE "customerId" = ${context.customerId}
       OR id IN (
         SELECT scni."creditNoteId"
         FROM "SalesCreditNoteItem" scni
         WHERE scni."itemId" = ${context.fgItemId}
       )
  `;

  await sql`
    UPDATE "SalesInvoice"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE "customerId" = ${context.customerId}
       OR id IN (
         SELECT sii."invoiceId"
         FROM "SalesInvoiceItem" sii
         WHERE sii."itemId" = ${context.fgItemId}
       )
  `;

  await sql`
    UPDATE "SalesOrder"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE "customerId" = ${context.customerId}
       OR id IN (
         SELECT soi."salesOrderId"
         FROM "SalesOrderItem" soi
         WHERE soi."itemId" = ${context.fgItemId}
       )
  `;

  await sql`
    UPDATE "SalesQuotation"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE "customerId" = ${context.customerId}
       OR id IN (
         SELECT sqi."quotationId"
         FROM "SalesQuotationItem" sqi
         WHERE sqi."itemId" = ${context.fgItemId}
       )
  `;

  await sql`
    UPDATE "SalesFinancePosting"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE "customerId" = ${context.customerId}
       OR "saleId" IN (
      SELECT id
      FROM "Sale"
      WHERE "customerId" = ${context.customerId}
         OR id IN (
           SELECT "saleId"
           FROM "SaleItem"
           WHERE "itemId" = ${context.fgItemId}
         )
    )
  `;

  await sql`
    UPDATE "SalesPayment"
    SET "isArchived" = true
    WHERE "saleId" IN (
      SELECT id
      FROM "Sale"
      WHERE "customerId" = ${context.customerId}
         OR id IN (
           SELECT "saleId"
           FROM "SaleItem"
           WHERE "itemId" = ${context.fgItemId}
         )
    )
  `;

  await sql`
    UPDATE "Sale"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE "customerId" = ${context.customerId}
       OR id IN (
         SELECT "saleId"
         FROM "SaleItem"
         WHERE "itemId" = ${context.fgItemId}
       )
  `;

  await sql`
    UPDATE "SalesReturn"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE "customerId" = ${context.customerId}
       OR id IN (
         SELECT "returnId"
         FROM "SalesReturnItem"
         WHERE "itemId" = ${context.fgItemId}
       )
  `;

  await sql`
    UPDATE "PriceList"
    SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
    WHERE id = ${context.priceListId}
  `;

  await archivePricingArtifacts(context);
}

export { closeTestDatabase };
export { runWithTransientDbRetry };

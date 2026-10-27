import assert from "node:assert/strict";
import { after, test } from "node:test";

import { createSalesQuotation, getSalesQuotationById, transitionSalesQuotation } from "@/services/sales/quotation.service";
import { cancelSalesOrder, convertQuotationToSalesOrder, getSalesOrderById } from "@/services/sales/sales-order.service";
import { archiveSalesArtifacts, closeTestDatabase, createSalesTestContext } from "./_helpers";

after(closeTestDatabase);

test("accepted quotation converts to an order without retyping commercial lines", async () => {
  const context = await createSalesTestContext();
  const actor = { userId: context.userId, userName: context.userName };
  const quotation = await createSalesQuotation({
    quotationDate: new Date().toISOString(),
    expiryDate: new Date(Date.now() + 7 * 86_400_000).toISOString(),
    customerId: context.customerId,
    channel: "FACTORY",
    locationId: context.factoryLocationId,
    status: "DRAFT",
    items: [{ itemId: context.fgItemId, quantity: 3 }],
  }, actor);

  await transitionSalesQuotation(quotation.id, "SENT", actor);
  await transitionSalesQuotation(quotation.id, "ACCEPTED", actor);
  const converted = await convertQuotationToSalesOrder(quotation.id, actor);
  const [quotationDetail, order] = await Promise.all([
    getSalesQuotationById(quotation.id),
    getSalesOrderById(converted.id),
  ]);

  assert.equal(quotationDetail?.status, "CONVERTED");
  assert.equal(order?.quotationId, quotation.id);
  assert.equal(order?.items.length, 1);
  assert.equal(order?.items[0]?.itemId, context.fgItemId);
  assert.equal(order?.items[0]?.orderedQty, 3);
  assert.equal(order?.items[0]?.unitPrice, 155);

  await archiveSalesArtifacts(context);
});

test("quotation conversion is blocked before customer acceptance", async () => {
  const context = await createSalesTestContext();
  const actor = { userId: context.userId, userName: context.userName };
  const quotation = await createSalesQuotation({
    quotationDate: new Date().toISOString(), customerId: context.customerId, channel: "FACTORY",
    locationId: context.factoryLocationId, status: "SENT", items: [{ itemId: context.fgItemId, quantity: 1 }],
  }, actor);

  await assert.rejects(() => convertQuotationToSalesOrder(quotation.id, actor), /Only accepted quotations/);
  await archiveSalesArtifacts(context);
});

test("open order cancellation records a terminal commercial status", async () => {
  const context = await createSalesTestContext();
  const actor = { userId: context.userId, userName: context.userName };
  const quotation = await createSalesQuotation({
    quotationDate: new Date().toISOString(), customerId: context.customerId, channel: "FACTORY",
    locationId: context.factoryLocationId, status: "DRAFT", items: [{ itemId: context.fgItemId, quantity: 2 }],
  }, actor);
  await transitionSalesQuotation(quotation.id, "SENT", actor);
  await transitionSalesQuotation(quotation.id, "ACCEPTED", actor);
  const converted = await convertQuotationToSalesOrder(quotation.id, actor);

  await cancelSalesOrder(converted.id, actor, "Customer withdrew the accepted demand");
  const order = await getSalesOrderById(converted.id);
  assert.equal(order?.status, "CANCELLED");

  await archiveSalesArtifacts(context);
});

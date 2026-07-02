import assert from "node:assert/strict";
import { after, test } from "node:test";

import { getSuppliers } from "@/lib/master-data-db";
import {
  approveGoodsReceipt,
  createGoodsReceipt,
  postGoodsReceipt,
} from "@/services/procurement/grn.service";
import {
  approvePurchaseOrder,
  createPurchaseOrder,
  getPurchaseOrderById,
} from "@/services/procurement/purchase-order.service";

import {
  closeTestDatabase,
  countStockMovements,
  createInventoryTestContext,
  getStockBalance,
} from "../inventory/_helpers";

after(closeTestDatabase);

test("approved PO flows into GRN posting and updates inventory plus PO received quantity", async () => {
  const context = await createInventoryTestContext();
  const suppliers = await getSuppliers();
  const before = await getStockBalance(context.itemId, context.sourceLocationId);

  if (!suppliers[0]?.id) {
    throw new Error("PO to GRN test requires at least one supplier");
  }

  const order = await createPurchaseOrder({
    poDate: new Date().toISOString(),
    supplierId: suppliers[0].id,
    deliveryLocationId: context.sourceLocationId,
    expectedDeliveryDate: new Date().toISOString(),
    paymentTerms: "NET30",
    remarks: "po to grn integration test",
    status: "SUBMITTED",
    createdById: context.adminUserId,
    lineItems: [{
      itemId: context.itemId,
      uomId: null,
      orderedQty: 7,
      unitPrice: 15,
      taxRate: 0,
      taxCodeId: null,
    }],
  });

  await approvePurchaseOrder(order.id, context.adminUserId);
  const orderDetail = await getPurchaseOrderById(order.id);
  if (!orderDetail?.items[0]?.id) {
    throw new Error("Approved purchase order line not found");
  }

  const receipt = await createGoodsReceipt({
    grnDate: new Date().toISOString(),
    poId: order.id,
    supplierId: suppliers[0].id,
    receivingLocationId: context.sourceLocationId,
    remarks: "po linked grn integration test",
    status: "SUBMITTED",
    createdById: context.adminUserId,
    lineItems: [{
      poItemId: orderDetail.items[0].id,
      itemId: context.itemId,
      uomId: orderDetail.items[0].uomId ?? null,
      orderedQty: orderDetail.items[0].orderedQty,
      previouslyReceivedQty: orderDetail.items[0].receivedQty,
      receivedQty: 7,
      acceptedQty: 7,
      rejectedQty: 0,
      unitCost: 15,
      taxAmount: 0,
    }],
  });

  await approveGoodsReceipt(receipt.id, context.adminUserId);
  await postGoodsReceipt(receipt.id, context.adminUserId);

  const after = await getStockBalance(context.itemId, context.sourceLocationId);
  const updatedOrder = await getPurchaseOrderById(order.id);

  assert.equal(after.quantity, before.quantity + 7);
  assert.equal(await countStockMovements(receipt.id, "PURCHASE_RECEIPT"), 1);
  assert.equal(updatedOrder?.items[0]?.receivedQty, 7);
  assert.equal(updatedOrder?.status, "RECEIVED");
});

import assert from "node:assert/strict";
import { after, test } from "node:test";

import {
  approveIssueDocument,
  createIssue,
  postIssueDocument,
} from "@/services/inventory/inventory-documents.service";

import {
  countStockMovements,
  closeTestDatabase,
  createInventoryTestContext,
  ensureStock,
  getStockBalance,
} from "./_helpers";

after(closeTestDatabase);

test("issue creates STORE_ISSUE and reduces stock", async () => {
  const context = await createInventoryTestContext();
  await ensureStock(context, 22, 9);
  const before = await getStockBalance(context.itemId, context.sourceLocationId);

  const issue = await createIssue({
    issueDate: new Date().toISOString(),
    locationId: context.sourceLocationId,
    issuedToType: "Department",
    issuedToId: context.departmentId,
    purpose: "test issue",
    createdById: context.adminUserId,
    approverId: context.secondUserId,
    status: "SUBMITTED",
    lineItems: [{ itemId: context.itemId, quantity: 5, unitCost: before.averageCost || 9 }],
  });

  await approveIssueDocument(issue.id, context.secondUserId);
  await postIssueDocument(issue.id, context.adminUserId);

  const after = await getStockBalance(context.itemId, context.sourceLocationId);
  assert.equal(after.quantity, before.quantity - 5);
  assert.equal(await countStockMovements(issue.id, "STORE_ISSUE"), 1);
});

test("issue cannot exceed available stock", async () => {
  const context = await createInventoryTestContext();
  await ensureStock(context, 3, 10);

  const issue = await createIssue({
    issueDate: new Date().toISOString(),
    locationId: context.sourceLocationId,
    issuedToType: "Department",
    issuedToId: context.departmentId,
    purpose: "over issue",
    createdById: context.adminUserId,
    approverId: context.secondUserId,
    status: "SUBMITTED",
    lineItems: [{ itemId: context.itemId, quantity: 999, unitCost: 10 }],
  });

  await approveIssueDocument(issue.id, context.secondUserId);

  await assert.rejects(
    () => postIssueDocument(issue.id, context.adminUserId),
    /Insufficient available stock/,
  );
});

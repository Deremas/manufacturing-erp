import assert from "node:assert/strict";
import { after, test } from "node:test";

import {
  approveIssueDocument,
  createIssue,
  postIssueDocument,
  rejectIssueDocument,
} from "@/services/inventory/inventory-documents.service";

import {
  createInventoryTestContext,
  closeTestDatabase,
  ensureStock,
  withPolicyOverrides,
} from "./_helpers";

after(closeTestDatabase);

test("approval-required policy blocks posting until approved and rejected document cannot post", async () => {
  const restore = await withPolicyOverrides({
    issue: {
      requireApproval: true,
      minimumQuantityThreshold: 1,
      minimumValueThreshold: 0,
      autoApproveForAdmin: false,
      isActive: true,
    },
  });

  try {
    const context = await createInventoryTestContext();
    await ensureStock(context, 50, 10);

    const issue = await createIssue({
      issueDate: new Date().toISOString(),
      locationId: context.sourceLocationId,
      issuedToType: "Department",
      issuedToId: context.departmentId,
      purpose: "approval flow",
      createdById: context.adminUserId,
      approverId: context.secondUserId,
      status: "SUBMITTED",
      lineItems: [{ itemId: context.itemId, quantity: 6, unitCost: 10 }],
    });

    await assert.rejects(
      () => postIssueDocument(issue.id, context.adminUserId),
      /awaiting approval|must be approved/i,
    );

    await approveIssueDocument(issue.id, context.secondUserId);
    await postIssueDocument(issue.id, context.adminUserId);

    const rejected = await createIssue({
      issueDate: new Date().toISOString(),
      locationId: context.sourceLocationId,
      issuedToType: "Department",
      issuedToId: context.departmentId,
      purpose: "rejected flow",
      createdById: context.adminUserId,
      approverId: context.secondUserId,
      status: "SUBMITTED",
      lineItems: [{ itemId: context.itemId, quantity: 3, unitCost: 10 }],
    });

    await rejectIssueDocument(rejected.id, context.secondUserId);
    await assert.rejects(
      () => postIssueDocument(rejected.id, context.adminUserId),
      /rejected/,
    );
  } finally {
    await restore();
  }
});

test("disabled approval policy allows direct posting", async () => {
  const restore = await withPolicyOverrides({
    issue: {
      requireApproval: false,
      minimumQuantityThreshold: 0,
      minimumValueThreshold: 0,
      autoApproveForAdmin: false,
      isActive: true,
    },
  });

  try {
    const context = await createInventoryTestContext();
    await ensureStock(context, 20, 10);

    const issue = await createIssue({
      issueDate: new Date().toISOString(),
      locationId: context.sourceLocationId,
      issuedToType: "Department",
      issuedToId: context.departmentId,
      purpose: "direct post",
      createdById: context.adminUserId,
      status: "SUBMITTED",
      lineItems: [{ itemId: context.itemId, quantity: 2, unitCost: 10 }],
    });

    await postIssueDocument(issue.id, context.adminUserId);
  } finally {
    await restore();
  }
});

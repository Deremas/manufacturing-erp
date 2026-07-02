import { sql } from "../lib/db";
import { seedOpeningStock } from "../lib/server/stock-seed";
import { getInventoryStockSnapshot } from "../services/inventory/inventory-insights.service";
import {
  approveTransferDocument,
  cancelTransferDocument,
  createTransfer,
  postTransferDocument,
  rejectTransferDocument,
} from "../services/inventory/inventory-documents.service";

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const users = await sql<Array<{ id: string }>>`
    SELECT id FROM "User"
    WHERE "isArchived" = false AND "isActive" = true
    ORDER BY "createdAt" ASC
    LIMIT 2
  `;
  const locations = await sql<Array<{ id: string }>>`
    SELECT id FROM "Location"
    WHERE "isArchived" = false AND "isActive" = true AND "isStockLocation" = true
    ORDER BY "locationName" ASC
    LIMIT 2
  `;
  const items = await sql<Array<{ id: string; standardCost: number | null }>>`
    SELECT id, "standardCost"
    FROM "Item"
    WHERE "isArchived" = false AND "isActive" = true
    ORDER BY "itemName" ASC
    LIMIT 1
  `;

  assert(users.length >= 2, "Need at least two active users for approval-assignment regression");
  assert(locations.length >= 2, "Need at least two stock locations for transfer regression");
  assert(items.length >= 1, "Need at least one active item for inventory regression");

  await seedOpeningStock({ force: false, quantityPerItem: 12, itemLimit: 1, locationLimit: 2, createdById: users[0].id, remarks: "Inventory regression seed" });

  const creatorId = users[0].id;
  const approverId = users[1].id;
  const fromLocationId = locations[0].id;
  const toLocationId = locations[1].id;
  const itemId = items[0].id;
  const unitCost = Number(items[0].standardCost ?? 1);

  const transfer = await createTransfer({
    transferDate: new Date().toISOString(),
    fromLocationId,
    toLocationId,
    approverId,
    remarks: "Regression transfer",
    status: "SUBMITTED",
    createdById: creatorId,
    lineItems: [{ itemId, quantity: 1, unitCost, remarks: "Regression line" }],
  });

  let blockedWrongApprover = false;
  try {
    await approveTransferDocument(transfer.id, creatorId);
  } catch {
    blockedWrongApprover = true;
  }
  assert(blockedWrongApprover, "Assigned approver enforcement failed");

  await approveTransferDocument(transfer.id, approverId);
  await postTransferDocument(transfer.id, creatorId);

  const snapshot = await getInventoryStockSnapshot(itemId, toLocationId);
  assert(snapshot && snapshot.availableQuantity >= 1, "Posted transfer did not increase destination stock");

  const cancelDoc = await createTransfer({
    transferDate: new Date().toISOString(),
    fromLocationId,
    toLocationId,
    remarks: "Regression cancel",
    status: "DRAFT",
    createdById: creatorId,
    lineItems: [{ itemId, quantity: 1, unitCost, remarks: "Cancel line" }],
  });
  await cancelTransferDocument(cancelDoc.id, creatorId);

  const rejectDoc = await createTransfer({
    transferDate: new Date().toISOString(),
    fromLocationId,
    toLocationId,
    approverId,
    remarks: "Regression reject",
    status: "SUBMITTED",
    createdById: creatorId,
    lineItems: [{ itemId, quantity: 1, unitCost, remarks: "Reject line" }],
  });
  await rejectTransferDocument(rejectDoc.id, approverId);

  const beforeMovements = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "StockMovement"
    WHERE "sourceDocumentId" = ${"regression-overissue"}
  `;

  let overIssueBlocked = false;
  try {
    const impossible = await createTransfer({
      transferDate: new Date().toISOString(),
      fromLocationId,
      toLocationId,
      approverId,
      remarks: "Regression overissue",
      status: "SUBMITTED",
      createdById: creatorId,
      lineItems: [{ itemId, quantity: 999999, unitCost, remarks: "Impossible line" }],
    });
    await approveTransferDocument(impossible.id, approverId);
    await sql`UPDATE "StockTransfer" SET remarks = 'regression-overissue' WHERE id = ${impossible.id}`;
    await postTransferDocument(impossible.id, creatorId);
  } catch {
    overIssueBlocked = true;
  }

  const afterMovements = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "StockMovement"
    WHERE "sourceDocumentId" = ${"regression-overissue"}
  `;

  assert(overIssueBlocked, "Over-issue regression did not fail");
  assert(Number(beforeMovements[0]?.count ?? 0) === Number(afterMovements[0]?.count ?? 0), "Rollback regression failed; movements were written on failure");

  console.log("Inventory regression checks passed.");
}

main()
  .catch((error) => {
    console.error("Inventory regression failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });

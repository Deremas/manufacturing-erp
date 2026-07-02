import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { postOpeningStock } from "@/services/inventory/inventory-posting.service";
import {
  listInventoryApprovalPolicies,
  saveInventoryApprovalPolicies,
  type InventoryApprovalPolicy,
} from "@/services/inventory/inventory-policy.service";

let closed = false;

export async function closeTestDatabase() {
  if (closed) {
    return;
  }

  closed = true;
  await sql.end({ timeout: 5 });
}

export interface InventoryTestContext {
  adminUserId: string;
  secondUserId: string;
  departmentId: string;
  sourceLocationId: string;
  destinationLocationId: string;
  quarantineLocationId: string;
  itemId: string;
  itemCode: string;
}

export async function createInventoryTestContext(): Promise<InventoryTestContext> {
  const [users, locations, departmentRows, supportRows] = await Promise.all([
    sql<Array<{ id: string }>>`
      SELECT id
      FROM "User"
      WHERE "isArchived" = false
      ORDER BY "createdAt" ASC
      LIMIT 2
    `,
    sql<Array<{ id: string }>>`
      SELECT id
      FROM "Location"
      WHERE "isArchived" = false
        AND "isStockLocation" = true
      ORDER BY "createdAt" ASC
      LIMIT 3
    `,
    sql<Array<{ id: string }>>`
      SELECT id
      FROM "Department"
      WHERE "isArchived" = false
      ORDER BY "createdAt" ASC
      LIMIT 1
    `,
    sql<Array<{ categoryId: string | null; itemTypeId: string | null; uomId: string | null }>>`
      SELECT
        (SELECT id FROM "Category" WHERE "isArchived" = false ORDER BY "createdAt" ASC LIMIT 1) AS "categoryId",
        (SELECT id FROM "ItemType" WHERE "isArchived" = false ORDER BY "createdAt" ASC LIMIT 1) AS "itemTypeId",
        (SELECT id FROM "Unit" WHERE "isArchived" = false ORDER BY "createdAt" ASC LIMIT 1) AS "uomId"
    `,
  ]);

  if (users.length < 2) {
    throw new Error("Inventory tests require at least two active users");
  }
  if (locations.length < 3) {
    throw new Error("Inventory tests require at least three active stock locations");
  }
  if (!departmentRows[0]?.id) {
    throw new Error("Inventory tests require at least one active department");
  }

  const support = supportRows[0];
  const itemCode = `TEST-INV-${Date.now()}-${randomUUID().slice(0, 6).toUpperCase()}`;
  const itemId = randomUUID();

  await sql`
    INSERT INTO "Item" (
      id,
      "itemCode",
      "itemName",
      "categoryId",
      "itemTypeId",
      "uomId",
      "reorderPoint",
      "standardCost",
      "isActive",
      "isArchived",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${itemId},
      ${itemCode},
      ${`Inventory Test Item ${itemCode}`},
      ${support?.categoryId ?? null},
      ${support?.itemTypeId ?? null},
      ${support?.uomId ?? null},
      5,
      10,
      true,
      false,
      NOW(),
      NOW()
    )
  `;

  return {
    adminUserId: users[0].id,
    secondUserId: users[1].id,
    departmentId: departmentRows[0].id,
    sourceLocationId: locations[0].id,
    destinationLocationId: locations[1].id,
    quarantineLocationId: locations[2].id,
    itemId,
    itemCode,
  };
}

export async function ensureStock(
  context: InventoryTestContext,
  quantity: number,
  unitCost = 10,
  locationId = context.sourceLocationId,
) {
  const balance = await getStockBalance(context.itemId, locationId);
  if (balance.quantity >= quantity) {
    return balance;
  }

  const diff = quantity - balance.quantity;
  await postOpeningStock({
    itemId: context.itemId,
    locationId,
    sourceModule: "inventory.test",
    sourceDocumentId: `seed-${randomUUID()}`,
    qtyIn: diff,
    qtyOut: 0,
    unitCost,
    remarks: "Inventory test stock seed",
    createdById: context.adminUserId,
  });

  return getStockBalance(context.itemId, locationId);
}

export async function getStockBalance(itemId: string, locationId: string) {
  const rows = await sql<Array<{ quantity: number; availableQuantity: number; averageCost: number }>>`
    SELECT quantity, "availableQuantity", "averageCost"
    FROM "StockBalance"
    WHERE "itemId" = ${itemId}
      AND "locationId" = ${locationId}
    LIMIT 1
  `;

  return rows[0] ?? { quantity: 0, availableQuantity: 0, averageCost: 0 };
}

export async function countStockMovements(sourceDocumentId: string, movementType?: string) {
  const rows = movementType
    ? await sql<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "StockMovement"
        WHERE "sourceDocumentId" = ${sourceDocumentId}
          AND "movementType" = ${movementType}
      `
    : await sql<Array<{ count: number }>>`
        SELECT COUNT(*)::int AS count
        FROM "StockMovement"
        WHERE "sourceDocumentId" = ${sourceDocumentId}
      `;

  return rows[0]?.count ?? 0;
}

export async function countAuditLogs(recordId: string, module: string) {
  const rows = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "AuditLog"
    WHERE "recordId" = ${recordId}
      AND module = ${module}
      AND "isArchived" = false
  `;

  return rows[0]?.count ?? 0;
}

export async function countDocumentHistory(referenceType: string, referenceId: string) {
  const rows = await sql<Array<{ count: number }>>`
    SELECT COUNT(*)::int AS count
    FROM "DocumentHistory"
    WHERE "referenceType" = ${referenceType}
      AND "referenceId" = ${referenceId}
      AND "isArchived" = false
  `;

  return rows[0]?.count ?? 0;
}

export async function withPolicyOverrides(
  overrides: Partial<Record<InventoryApprovalPolicy["documentType"], Partial<InventoryApprovalPolicy>>>,
) {
  const current = await listInventoryApprovalPolicies();
  const merged = current.map((policy) => ({
    ...policy,
    ...(overrides[policy.documentType] ?? {}),
  }));

  await saveInventoryApprovalPolicies(merged);

  return async () => {
    await saveInventoryApprovalPolicies(current);
  };
}

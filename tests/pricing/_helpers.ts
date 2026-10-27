import { randomUUID } from "node:crypto";

import { sql } from "@/lib/db";
import { runWithTransientDbRetry } from "@/tests/_db-test-utils";
import { closeTestDatabase } from "../inventory/_helpers";

export interface PricingTestContext {
  userId: string;
  userName: string;
  fgItemId: string;
  fgItemCode: string;
  unitId: string;
  unitCode: string;
  factoryLocationId: string;
  branchLocationId: string;
  customerId: string;
  customerGroup: string;
  bankAccountId: string;
}

export async function createPricingTestContext(): Promise<PricingTestContext> {
  return runWithTransientDbRetry(async () => {
    const [userRows, fgTypeRows, categoryRows, unitRows, factoryRows, branchRows, bankAccountRows] =
      await Promise.all([
        sql<Array<{ id: string; name: string | null }>>`
          SELECT id, name
          FROM "User"
          WHERE "isArchived" = false
          ORDER BY "createdAt" ASC
          LIMIT 1
        `,
        sql<Array<{ id: string }>>`
          SELECT id
          FROM "ItemType"
          WHERE "isArchived" = false
            AND (
              UPPER(code) = 'FG'
              OR UPPER(name) LIKE '%FINISHED%'
            )
          ORDER BY "createdAt" ASC
          LIMIT 1
        `,
        sql<Array<{ id: string }>>`
          SELECT id
          FROM "Category"
          WHERE "isArchived" = false
          ORDER BY "createdAt" ASC
          LIMIT 1
        `,
        sql<Array<{ id: string; code: string | null; name: string }>>`
          SELECT id, code, name
          FROM "Unit"
          WHERE "isArchived" = false
            AND "isActive" = true
          ORDER BY "createdAt" ASC
          LIMIT 1
        `,
        sql<Array<{ id: string }>>`
          SELECT id
          FROM "Location"
          WHERE "isArchived" = false
            AND "isActive" = true
            AND UPPER(COALESCE("locationType", '')) LIKE '%FACTORY%'
          ORDER BY "createdAt" ASC
          LIMIT 1
        `,
        sql<Array<{ id: string }>>`
          SELECT id
          FROM "Location"
          WHERE "isArchived" = false
            AND "isActive" = true
            AND UPPER(COALESCE("locationType", '')) LIKE '%BRANCH%'
          ORDER BY "createdAt" ASC
          LIMIT 1
        `,
        sql<Array<{ id: string }>>`
          SELECT id
          FROM "BankAccount"
          WHERE "isArchived" = false
            AND "isActive" = true
            AND "allowPayments" = true
            AND "allowReceipts" = true
          ORDER BY "createdAt" ASC
          LIMIT 1
        `,
      ]);

    const user = userRows[0];
    const fgType = fgTypeRows[0];
    const category = categoryRows[0];
    const unit = unitRows[0];
    const factory = factoryRows[0];
    const branch = branchRows[0];
    const bankAccount = bankAccountRows[0];

    if (!user?.id || !fgType?.id || !category?.id || !unit?.id || !factory?.id || !branch?.id || !bankAccount?.id) {
      throw new Error("Pricing tests require seeded user, FG item type, category, unit, factory/branch locations, and bank account");
    }

    const codeSuffix = `${Date.now().toString().slice(-4)}${randomUUID().slice(0, 4).toUpperCase()}`;
    const fgItemCode = `FG-T${codeSuffix}`;
    const fgItemId = randomUUID();
    const customerId = randomUUID();
    const customerCode = `CUST-T${codeSuffix}`;

    await sql`
      INSERT INTO "Customer" (
        id,
        "customerCode",
        name,
        "customerType",
        "creditLimit",
        "paymentTerms",
        "isActive",
        "isArchived",
        "createdById",
        "updatedById",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${customerId},
        ${customerCode},
        ${`Pricing Test Customer ${codeSuffix}`},
        'WHOLESALE',
        100000,
        'CASH',
        true,
        false,
        ${user.id},
        ${user.id},
        NOW(),
        NOW()
      )
    `;

    await sql`
      INSERT INTO "Item" (
        id,
        "itemCode",
        "itemName",
        "categoryId",
        "itemTypeId",
        "uomId",
        "standardCost",
        "sellingPrice",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${fgItemId},
        ${fgItemCode},
        ${`Pricing Test FG ${codeSuffix}`},
        ${category.id},
        ${fgType.id},
        ${unit.id},
        25,
        0,
        true,
        false,
        NOW(),
        NOW()
      )
    `;

    return {
      userId: user.id,
      userName: user.name ?? "System Administrator",
      fgItemId,
      fgItemCode,
      unitId: unit.id,
      unitCode: unit.code ?? unit.name,
      factoryLocationId: factory.id,
      branchLocationId: branch.id,
      customerId,
      customerGroup: `GROUP-${codeSuffix}`,
      bankAccountId: bankAccount.id,
    };
  });
}

export async function archivePricingArtifacts(context: PricingTestContext) {
  const priceListIds = await sql<Array<{ priceListId: string }>>`
    SELECT DISTINCT "priceListId"
    FROM "PriceListItem"
    WHERE "itemId" = ${context.fgItemId}
  `;

  await sql`
    UPDATE "PriceListItem"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE "itemId" = ${context.fgItemId}
  `;

  for (const row of priceListIds) {
    await sql`
      UPDATE "PriceList"
      SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
      WHERE id = ${row.priceListId}
    `;
  }

  await sql`
    UPDATE "Item"
    SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
    WHERE id = ${context.fgItemId}
  `;

  await sql`
    UPDATE "Customer"
    SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
    WHERE id = ${context.customerId}
  `;
}

export { closeTestDatabase };

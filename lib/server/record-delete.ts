import { sql } from "@/lib/db";

type DeleteResult =
  | { status: number; body: Record<string, unknown> };

function notFound(entity: string): DeleteResult {
  return { status: 404, body: { error: `${entity} not found` } };
}

function protectedRecord(message: string): DeleteResult {
  return { status: 409, body: { error: message } };
}

export async function deleteMasterDataRecord(
  entity: string,
  id: string,
): Promise<DeleteResult> {
  try {
    if (entity === "categories") {
      const result = await sql.begin(async (tx) => {
        const childCategories = await tx<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "Category"
          WHERE "parentCategoryId" = ${id} AND "isArchived" = false
        `;
        if (Number(childCategories[0]?.count ?? 0) > 0) {
          return protectedRecord(
            "This category has child categories and cannot be deleted.",
          );
        }

        const linkedItems = await tx<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "Item"
          WHERE "categoryId" = ${id} AND "isArchived" = false
        `;
        if (Number(linkedItems[0]?.count ?? 0) > 0) {
          return protectedRecord(
            "This category is used by items and cannot be deleted.",
          );
        }

        const updated = await tx<Array<{ id: string }>>`
          UPDATE "Category"
          SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
          WHERE id = ${id} AND "isArchived" = false
          RETURNING id
        `;
        return updated[0]?.id ? { status: 200, body: { success: true, id } } : notFound("Category");
      });
      return result;
    }

    if (entity === "item-types") {
      const result = await sql.begin(async (tx) => {
        const linkedItems = await tx<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "Item"
          WHERE "itemTypeId" = ${id} AND "isArchived" = false
        `;
        if (Number(linkedItems[0]?.count ?? 0) > 0) {
          return protectedRecord(
            "This item type is used by items and cannot be deleted.",
          );
        }

        const updated = await tx<Array<{ id: string }>>`
          UPDATE "ItemType"
          SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
          WHERE id = ${id} AND "isArchived" = false
          RETURNING id
        `;
        return updated[0]?.id ? { status: 200, body: { success: true, id } } : notFound("Item type");
      });
      return result;
    }

    if (entity === "units") {
      const result = await sql.begin(async (tx) => {
        const linkedItems = await tx<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "Item"
          WHERE "uomId" = ${id} AND "isArchived" = false
        `;
        const conversions = await tx<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "UnitConversion"
          WHERE ("fromUnitId" = ${id} OR "toUnitId" = ${id}) AND "isArchived" = false
        `;
        if (Number(linkedItems[0]?.count ?? 0) > 0 || Number(conversions[0]?.count ?? 0) > 0) {
          return protectedRecord("This unit is in use and cannot be deleted.");
        }

        const updated = await tx<Array<{ id: string }>>`
          UPDATE "Unit"
          SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
          WHERE id = ${id} AND "isArchived" = false
          RETURNING id
        `;
        return updated[0]?.id ? { status: 200, body: { success: true, id } } : notFound("Unit");
      });
      return result;
    }

    if (entity === "customers") {
      const result = await sql.begin(async (tx) => {
        const updated = await tx<Array<{ id: string }>>`
          UPDATE "Customer"
          SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
          WHERE id = ${id} AND "isArchived" = false
          RETURNING id
        `;
        return updated[0]?.id ? { status: 200, body: { success: true, id } } : notFound("Customer");
      });
      return result;
    }

    if (entity === "suppliers") {
      const result = await sql.begin(async (tx) => {
        const linkedItems = await tx<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "Item"
          WHERE "defaultSupplierId" = ${id} AND "isArchived" = false
        `;
        if (Number(linkedItems[0]?.count ?? 0) > 0) {
          return protectedRecord(
            "This supplier is linked to items and cannot be deleted.",
          );
        }

        const updated = await tx<Array<{ id: string }>>`
          UPDATE "Supplier"
          SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
          WHERE id = ${id} AND "isArchived" = false
          RETURNING id
        `;
        return updated[0]?.id ? { status: 200, body: { success: true, id } } : notFound("Supplier");
      });
      return result;
    }

    if (entity === "banks") {
      const result = await sql.begin(async (tx) => {
        const linkedAccounts = await tx<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "BankAccount"
          WHERE "bankId" = ${id} AND "isArchived" = false
        `;
        if (Number(linkedAccounts[0]?.count ?? 0) > 0) {
          return protectedRecord(
            "This bank has bank accounts and cannot be deleted.",
          );
        }

        const updated = await tx<Array<{ id: string }>>`
          UPDATE "Bank"
          SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
          WHERE id = ${id} AND "isArchived" = false
          RETURNING id
        `;
        return updated[0]?.id ? { status: 200, body: { success: true, id } } : notFound("Bank");
      });
      return result;
    }

    if (entity === "bank-accounts") {
      const result = await sql.begin(async (tx) => {
        const linkedLocations = await tx<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "Location"
          WHERE "defaultBankAccountId" = ${id} AND "isArchived" = false
        `;
        if (Number(linkedLocations[0]?.count ?? 0) > 0) {
          return protectedRecord(
            "This bank account is used by a location and cannot be deleted.",
          );
        }

        const updated = await tx<Array<{ id: string }>>`
          UPDATE "BankAccount"
          SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
          WHERE id = ${id} AND "isArchived" = false
          RETURNING id
        `;
        return updated[0]?.id ? { status: 200, body: { success: true, id } } : notFound("Bank account");
      });
      return result;
    }

    if (entity === "departments") {
      const result = await sql.begin(async (tx) => {
        const linkedItems = await tx<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "Item"
          WHERE "departmentId" = ${id} AND "isArchived" = false
        `;
        if (Number(linkedItems[0]?.count ?? 0) > 0) {
          return protectedRecord(
            "This department is used by items and cannot be deleted.",
          );
        }

        const updated = await tx<Array<{ id: string }>>`
          UPDATE "Department"
          SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
          WHERE id = ${id} AND "isArchived" = false
          RETURNING id
        `;
        return updated[0]?.id ? { status: 200, body: { success: true, id } } : notFound("Department");
      });
      return result;
    }

    if (entity === "price-lists") {
      const result = await sql.begin(async (tx) => {
        const linkedItems = await tx<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "PriceListItem"
          WHERE "priceListId" = ${id} AND "isArchived" = false
        `;
        if (Number(linkedItems[0]?.count ?? 0) > 0) {
          return protectedRecord(
            "This price list has items and cannot be deleted.",
          );
        }

        const updated = await tx<Array<{ id: string }>>`
          UPDATE "PriceList"
          SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
          WHERE id = ${id} AND "isArchived" = false
          RETURNING id
        `;
        return updated[0]?.id ? { status: 200, body: { success: true, id } } : notFound("Price list");
      });
      return result;
    }

    if (entity === "items") {
      const result = await sql.begin(async (tx) => {
        const linkedPriceItems = await tx<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "PriceListItem"
          WHERE "itemId" = ${id} AND "isArchived" = false
        `;
        const linkedStock = await tx<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "StockMovement"
          WHERE "itemId" = ${id}
        `;
        if (Number(linkedPriceItems[0]?.count ?? 0) > 0 || Number(linkedStock[0]?.count ?? 0) > 0) {
          return protectedRecord("This item is in use and cannot be deleted.");
        }

        const updated = await tx<Array<{ id: string }>>`
          UPDATE "Item"
          SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
          WHERE id = ${id} AND "isArchived" = false
          RETURNING id
        `;
        return updated[0]?.id ? { status: 200, body: { success: true, id } } : notFound("Item");
      });
      return result;
    }

    return { status: 404, body: { error: `Unsupported entity: ${entity}` } };
  } catch (error) {
    console.error("Failed to delete record", error);
    return { status: 500, body: { error: "Failed to delete record" } };
  }
}

export async function deleteAdministrationRecord(
  entity: string,
  id: string,
): Promise<DeleteResult> {
  try {
    if (entity === "locations") {
      const result = await sql.begin(async (tx) => {
        const childLocations = await tx<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "Location"
          WHERE "parentLocationId" = ${id} AND "isArchived" = false
        `;
        const userLocations = await tx<Array<{ count: bigint }>>`
          SELECT COUNT(*)::bigint AS count
          FROM "UserLocation"
          WHERE "locationId" = ${id}
        `;
        if (Number(childLocations[0]?.count ?? 0) > 0 || Number(userLocations[0]?.count ?? 0) > 0) {
          return protectedRecord("This location is in use and cannot be deleted.");
        }

        const updated = await tx<Array<{ id: string }>>`
          UPDATE "Location"
          SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
          WHERE id = ${id} AND "isArchived" = false
          RETURNING id
        `;
        return updated[0]?.id ? { status: 200, body: { success: true, id } } : notFound("Location");
      });
      return result;
    }

    if (entity === "users") {
      const result = await sql.begin(async (tx) => {
        const userRows = await tx<Array<{ id: string; isSystemRole: boolean }>>`
          SELECT u.id, COALESCE(r."isSystem", false) AS "isSystemRole"
          FROM "User" u
          LEFT JOIN "Role" r ON r.id = u."roleId"
          WHERE u.id = ${id} AND u."isArchived" = false
          LIMIT 1
        `;
        const user = userRows[0];
        if (!user) return notFound("User");
        if (user.isSystemRole) {
          return protectedRecord("Users with system roles cannot be deleted.");
        }

        const updated = await tx<Array<{ id: string }>>`
          UPDATE "User"
          SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
          WHERE id = ${id} AND "isArchived" = false
          RETURNING id
        `;
        await tx`
          UPDATE "UserLocation"
          SET "isDefault" = false
          WHERE "userId" = ${id}
        `;
        return updated[0]?.id ? { status: 200, body: { success: true, id } } : notFound("User");
      });
      return result;
    }

    return { status: 404, body: { error: `Unsupported entity: ${entity}` } };
  } catch (error) {
    console.error("Failed to delete administration record", error);
    return { status: 500, body: { error: "Failed to delete record" } };
  }
}

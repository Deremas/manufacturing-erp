import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";

const permissionModules = [
  "administration",
  "master-data",
  "procurement",
  "inventory",
  "production",
  "sales",
  "finance",
  "accounting",
  "hr",
  "fleet",
  "reports",
  "qc",
  "maintenance",
  "shifts",
];

const permissionActions = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "print",
  "export",
];

const locations = [
  {
    locationCode: "FACTORY-001",
    locationName: "Main Factory",
    locationType: "Factory",
    address: "Industrial Area, Nairobi",
    isStockLocation: true,
    isProcurementLocation: true,
    isProductionLocation: true,
    isSalesLocation: false,
    isTransitLocation: false,
    isScrapLocation: false,
  },
  {
    locationCode: "RM-STORE",
    locationName: "Raw Material Store",
    locationType: "Raw Material Store",
    address: "Factory Store",
    isStockLocation: true,
    isProcurementLocation: true,
    isProductionLocation: false,
    isSalesLocation: false,
    isTransitLocation: false,
    isScrapLocation: false,
  },
  {
    locationCode: "FG-STORE",
    locationName: "Finished Goods Store",
    locationType: "Finished Goods Store",
    address: "Dispatch Area",
    isStockLocation: true,
    isProcurementLocation: false,
    isProductionLocation: false,
    isSalesLocation: true,
    isTransitLocation: false,
    isScrapLocation: false,
  },
  {
    locationCode: "SCRAP-001",
    locationName: "Scrap Area",
    locationType: "Scrap",
    address: "Yard Corner",
    isStockLocation: false,
    isProcurementLocation: false,
    isProductionLocation: false,
    isSalesLocation: false,
    isTransitLocation: false,
    isScrapLocation: true,
  },
  {
    locationCode: "BRANCH-001",
    locationName: "Nairobi Branch",
    locationType: "Branch",
    address: "Westlands, Nairobi",
    isStockLocation: true,
    isProcurementLocation: false,
    isProductionLocation: false,
    isSalesLocation: true,
    isTransitLocation: false,
    isScrapLocation: false,
  },
];

const categories = [
  {
    code: "RAW",
    name: "Raw Materials",
    description: "Input materials used in production",
  },
  {
    code: "PACK",
    name: "Packaging Materials",
    description: "Packaging and wrapping materials",
  },
  { code: "FG", name: "Finished Goods", description: "Items ready for sale" },
  {
    code: "CONS",
    name: "Consumables",
    description: "Low-value consumable stock",
  },
  {
    code: "SPARE",
    name: "Spare Parts",
    description: "Maintenance and spare parts",
  },
];

const units = [
  { code: "PCS", name: "Piece", abbreviation: "pcs", type: "QUANTITY" },
  { code: "KG", name: "Kilogram", abbreviation: "kg", type: "WEIGHT" },
  { code: "LTR", name: "Liter", abbreviation: "ltr", type: "VOLUME" },
  { code: "BOX", name: "Box", abbreviation: "box", type: "QUANTITY" },
  { code: "MTR", name: "Meter", abbreviation: "m", type: "LENGTH" },
  { code: "ROLL", name: "Roll", abbreviation: "roll", type: "QUANTITY" },
];

const itemTypes = [
  {
    code: "RAW",
    name: "Raw Material",
    description: "Purchasable stock used in production",
  },
  {
    code: "PACK",
    name: "Packaging Material",
    description: "Packaging stock used in production",
  },
  {
    code: "FG",
    name: "Finished Good",
    description: "Sellable finished item",
  },
  {
    code: "CONS",
    name: "Consumable",
    description: "Consumable item",
  },
  {
    code: "SPARE",
    name: "Spare Part",
    description: "Equipment spare part",
  },
  {
    code: "SERVICE",
    name: "Service",
    description: "Non-stock service",
  },
];

const taxCodes = [
  {
    code: "VAT15",
    taxName: "VAT 15%",
    taxType: "VAT",
    rate: 15,
    appliesTo: "BOTH",
    isDefault: true,
  },
  {
    code: "VAT0",
    taxName: "VAT 0%",
    taxType: "VAT",
    rate: 0,
    appliesTo: "BOTH",
  },
  {
    code: "EXC10",
    taxName: "Excise 10%",
    taxType: "EXCISE",
    rate: 10,
    appliesTo: "SALES",
  },
  {
    code: "WHT5",
    taxName: "Withholding 3%",
    taxType: "WITHHOLDING",
    rate: 3,
    appliesTo: "PURCHASE",
  },
];

const departments = [
  { code: "PROD", name: "Production" },
  { code: "PROC", name: "Procurement" },
  { code: "SALES", name: "Sales" },
  { code: "FIN", name: "Finance" },
  { code: "WH", name: "Warehouse" },
];

const banks = [
  { id: "ECB", name: "Ethiopia Commercial Bank", shortName: "KCB" },
  { id: "EQUITY", name: "Equity Bank", shortName: "Equity" },
  { id: "COOP", name: "Co-operative Bank", shortName: "Co-op" },
];

const customers = [
  {
    customerCode: "CUST-001",
    name: "ABC Enterprises Ltd",
    phone: "+254711000001",
    email: "info@abcenterprises.co.ke",
    address: "Nairobi, Kenya",
    creditLimit: 500000,
    paymentTerms: "NET30",
  },
  {
    customerCode: "CUST-002",
    name: "Nairobi Wholesalers",
    phone: "+254711000002",
    email: "orders@nairobwholesale.co.ke",
    address: "Nairobi Industrial Area",
    creditLimit: 1000000,
    paymentTerms: "NET60",
  },
];

const suppliers = [
  {
    supplierCode: "SUP-001",
    name: "Industrial Raw Materials Ltd",
    contactPerson: "John Doe",
    phone: "+254722000001",
    email: "john@irm.co.ke",
    address: "Nairobi Industrial Area",
    paymentTerms: "NET30",
  },
  {
    supplierCode: "SUP-002",
    name: "Packaging Solutions Ltd",
    contactPerson: "Mary Wanjiku",
    phone: "+254722000002",
    email: "mary@packsol.co.ke",
    address: "Thika Road",
    paymentTerms: "NET30",
  },
];

const items = [
  {
    itemCode: "RM-001",
    itemName: "Corn Flour - Grade A",
    sku: "CF-GA-001",
    categoryCode: "RAW",
    itemTypeCode: "RAW",
    uomCode: "KG",
    reorderPoint: 25,
    standardCost: 45,
    vatApplicable: true,
    exciseApplicable: false,
  },
  {
    itemCode: "FG-001",
    itemName: "Maize Flour - 2kg Pack",
    sku: "MF-2KG-001",
    categoryCode: "FG",
    itemTypeCode: "FG",
    uomCode: "PCS",
    reorderPoint: 50,
    sellingPrice: 145,
    vatApplicable: true,
    exciseApplicable: false,
  },
  {
    itemCode: "PACK-001",
    itemName: "Plastic Bag - 2kg",
    sku: "PB-2KG-001",
    categoryCode: "PACK",
    itemTypeCode: "PACK",
    uomCode: "PCS",
    reorderPoint: 100,
    standardCost: 5,
    vatApplicable: true,
    exciseApplicable: false,
  },
];

const priceLists = [
  {
    code: "RETAIL-2026",
    name: "Retail Price List",
    currency: "ETB",
    customerGroup: "Retail",
    price: 145,
    effectiveFrom: "2026-01-01T00:00:00Z",
  },
  {
    code: "WHOLESALE-2026",
    name: "Wholesale Price List",
    currency: "ETB",
    customerGroup: "Wholesale",
    price: 135,
    effectiveFrom: "2026-01-01T00:00:00Z",
  },
];

function titleCase(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function makeSeedId(prefix: string, value: string): string {
  return `${prefix}-${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

async function seedPermissions() {
  const permissions: Array<{ id: string; module: string; action: string }> = [];

  for (const module of permissionModules) {
    for (const action of permissionActions) {
      const id = `${module}.${action}`;
      await sql`
        INSERT INTO "Permission" ("id", "module", "action", "label", "isArchived")
        VALUES (${id}, ${module}, ${action}, ${`${titleCase(module)} ${titleCase(action)}`}, false)
        ON CONFLICT ("id") DO UPDATE SET
          "module" = EXCLUDED."module",
          "action" = EXCLUDED."action",
          "label" = EXCLUDED."label",
          "isArchived" = false
      `;
      permissions.push({ id, module, action });
    }
  }

  return permissions;
}

async function seedRoles(
  permissions: Array<{ id: string; module: string; action: string }>,
) {
  const roleRows = await sql<Array<{ id: string; name: string }>>`
    INSERT INTO "Role" ("id", "name", "description", "isSystem", "isActive", "isArchived", "createdAt", "updatedAt")
    VALUES
      (${makeSeedId("role", "super-admin")}, 'Super Admin', 'Reserved system role with full access.', true, true, false, NOW(), NOW()),
      (${makeSeedId("role", "admin")}, 'Admin', 'Administrative access for daily operations.', false, true, false, NOW(), NOW()),
      (${makeSeedId("role", "user")}, 'User', 'Standard read access for day-to-day use.', false, true, false, NOW(), NOW())
    ON CONFLICT ("name") DO UPDATE SET
      "description" = EXCLUDED."description",
      "isSystem" = EXCLUDED."isSystem",
      "isActive" = true,
      "isArchived" = false,
      "updatedAt" = NOW()
    RETURNING "id", "name"
  `;

  const roleByName = new Map(roleRows.map((row) => [row.name, row.id]));
  const superAdminId = roleByName.get("Super Admin")!;
  const adminId = roleByName.get("Admin")!;
  const userId = roleByName.get("User")!;

  const rolePermissionRows = [
    ...permissions.map((permission) => ({
      roleId: superAdminId,
      permissionId: permission.id,
      module: permission.module,
      action: permission.action,
    })),
    ...permissions
      .filter(
        (permission) =>
          permission.module === "administration" ||
          permission.module === "master-data" ||
          permission.action === "view",
      )
      .map((permission) => ({
        roleId: adminId,
        permissionId: permission.id,
        module: permission.module,
        action: permission.action,
      })),
    ...permissions
      .filter((permission) => permission.action === "view")
      .map((permission) => ({
        roleId: userId,
        permissionId: permission.id,
        module: permission.module,
        action: permission.action,
      })),
  ];

  for (const row of rolePermissionRows) {
    await sql`
      INSERT INTO "RolePermission" ("id", "roleId", "permission", "module", "action", "isArchived")
      VALUES (${`${row.roleId}:${row.permissionId}`}, ${row.roleId}, ${row.permissionId}, ${row.module}, ${row.action}, false)
      ON CONFLICT ("id") DO UPDATE SET
        "roleId" = EXCLUDED."roleId",
        "permission" = EXCLUDED."permission",
        "module" = EXCLUDED."module",
        "action" = EXCLUDED."action",
        "isArchived" = false
    `;
  }

  return { superAdminId, adminId, userId };
}

async function seedLocations(adminUserId: string) {
  const rows: Array<{ id: string; locationCode: string }> = [];

  for (const location of locations) {
    const result = await sql<Array<{ id: string; locationCode: string }>>`
      INSERT INTO "Location" (
        "id",
        "locationCode",
        "locationName",
        "locationType",
        address,
        "isStockLocation",
        "isProcurementLocation",
        "isProductionLocation",
        "isSalesLocation",
        "isTransitLocation",
        "isScrapLocation",
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("location", location.locationCode)},
        ${location.locationCode},
        ${location.locationName},
        ${location.locationType},
        ${location.address},
        ${location.isStockLocation},
        ${location.isProcurementLocation},
        ${location.isProductionLocation},
        ${location.isSalesLocation},
        ${location.isTransitLocation},
        ${location.isScrapLocation},
        ${adminUserId},
        ${adminUserId},
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("locationCode") DO UPDATE SET
        "locationName" = EXCLUDED."locationName",
        "locationType" = EXCLUDED."locationType",
        address = EXCLUDED.address,
        "isStockLocation" = EXCLUDED."isStockLocation",
        "isProcurementLocation" = EXCLUDED."isProcurementLocation",
        "isProductionLocation" = EXCLUDED."isProductionLocation",
        "isSalesLocation" = EXCLUDED."isSalesLocation",
        "isTransitLocation" = EXCLUDED."isTransitLocation",
        "isScrapLocation" = EXCLUDED."isScrapLocation",
        "updatedById" = EXCLUDED."updatedById",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
      RETURNING "id", "locationCode"
    `;
    rows.push(result[0]);
  }

  return rows;
}

async function seedUserRecord(
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
    role: string;
    roleId: string;
    phone: string;
  },
  password: string,
) {
  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO "User" (
      "id",
      "name",
      "email",
      "username",
      "password",
      "language",
      "dateFormat",
      "itemsPerPage",
      "lastLogin",
      "role",
      "phone",
      "isActive",
      "isArchived",
      "roleId",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${user.id},
      ${user.name},
      ${user.email},
      ${user.username},
      ${password},
      'en',
      'DD/MM/YYYY',
      25,
      NOW(),
      ${user.role},
      ${user.phone},
      true,
      false,
      ${user.roleId},
      NOW(),
      NOW()
    )
    ON CONFLICT ("email") DO UPDATE SET
      "name" = EXCLUDED."name",
      "username" = EXCLUDED."username",
      "password" = EXCLUDED."password",
      "language" = EXCLUDED."language",
      "dateFormat" = EXCLUDED."dateFormat",
      "itemsPerPage" = EXCLUDED."itemsPerPage",
      "lastLogin" = EXCLUDED."lastLogin",
      "role" = EXCLUDED."role",
      "phone" = EXCLUDED."phone",
      "isActive" = true,
      "isArchived" = false,
      "roleId" = EXCLUDED."roleId",
      "updatedAt" = NOW()
    RETURNING "id"
  `;

  return rows[0].id;
}

async function seedAdditionalUsers(roleIds: {
  adminId: string;
  userId: string;
}) {
  const password = await bcrypt.hash("1234", 12);
  const managerUserId = await seedUserRecord(
    {
      id: makeSeedId("user", "operations-manager"),
      name: "Operations Manager",
      email: "manager@newerp.local",
      username: "manager",
      role: "Admin",
      roleId: roleIds.adminId,
      phone: "+254700000001",
    },
    password,
  );
  const clerkUserId = await seedUserRecord(
    {
      id: makeSeedId("user", "warehouse-clerk"),
      name: "Warehouse Clerk",
      email: "clerk@newerp.local",
      username: "clerk",
      role: "User",
      roleId: roleIds.userId,
      phone: "+254700000002",
    },
    password,
  );

  return { managerUserId, clerkUserId };
}

async function seedUserLocations(userId: string, locationIds: string[]) {
  for (let index = 0; index < locationIds.length; index += 1) {
    const locationId = locationIds[index];
    await sql`
      INSERT INTO "UserLocation" ("id", "userId", "locationId", "isDefault")
      VALUES (${`${userId}:${locationId}`}, ${userId}, ${locationId}, ${index === 0})
      ON CONFLICT ("userId", "locationId") DO UPDATE SET
        "isDefault" = EXCLUDED."isDefault"
    `;
  }
}

async function seedMasterData() {
  for (const category of categories) {
    await sql`
      INSERT INTO "Category" ("id", "code", "name", "description", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${makeSeedId("category", category.code ?? category.name)}, ${category.code}, ${category.name}, ${category.description}, true, false, NOW(), NOW())
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const unit of units) {
    await sql`
      INSERT INTO "Unit" ("id", "code", "name", "abbreviation", "type", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${makeSeedId("unit", unit.code ?? unit.abbreviation)}, ${unit.code}, ${unit.name}, ${unit.abbreviation}, ${unit.type}, true, false, NOW(), NOW())
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "abbreviation" = EXCLUDED."abbreviation",
        "type" = EXCLUDED."type",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const itemType of itemTypes) {
    await sql`
      INSERT INTO "ItemType" (
        "id",
        "code",
        "name",
        "description",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("itemtype", itemType.code)},
        ${itemType.code},
        ${itemType.name},
        ${itemType.description},
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const taxCode of taxCodes) {
    await sql`
      INSERT INTO "TaxCode" ("id", "code", "taxName", "taxType", "rate", "appliesTo", "isDefault", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${makeSeedId("tax", taxCode.code ?? taxCode.taxName)}, ${taxCode.code}, ${taxCode.taxName}, ${taxCode.taxType}, ${taxCode.rate}, ${taxCode.appliesTo}, ${taxCode.isDefault ?? false}, true, false, NOW(), NOW())
      ON CONFLICT ("code") DO UPDATE SET
        "taxName" = EXCLUDED."taxName",
        "taxType" = EXCLUDED."taxType",
        "rate" = EXCLUDED."rate",
        "appliesTo" = EXCLUDED."appliesTo",
        "isDefault" = EXCLUDED."isDefault",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const department of departments) {
    await sql`
      INSERT INTO "Department" ("id", "code", "name", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${makeSeedId("department", department.code)}, ${department.code}, ${department.name}, true, false, NOW(), NOW())
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const bank of banks) {
    await sql`
      INSERT INTO "Bank" ("id", "name", "shortName", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${bank.id}, ${bank.name}, ${bank.shortName}, true, false, NOW(), NOW())
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "shortName" = EXCLUDED."shortName",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const customer of customers) {
    await sql`
      INSERT INTO "Customer" (
        "id",
        "customerCode",
        "name",
        phone,
        email,
        address,
        "creditLimit",
        "paymentTerms",
        "vatRegistered",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("customer", customer.customerCode)},
        ${customer.customerCode},
        ${customer.name},
        ${customer.phone},
        ${customer.email},
        ${customer.address},
        ${customer.creditLimit},
        ${customer.paymentTerms},
        false,
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("customerCode") DO UPDATE SET
        "name" = EXCLUDED."name",
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        address = EXCLUDED.address,
        "creditLimit" = EXCLUDED."creditLimit",
        "paymentTerms" = EXCLUDED."paymentTerms",
        "vatRegistered" = false,
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const supplier of suppliers) {
    await sql`
      INSERT INTO "Supplier" (
        "id",
        "supplierCode",
        "name",
        "contactPerson",
        phone,
        email,
        address,
        "paymentTerms",
        "vatRegistered",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("supplier", supplier.supplierCode)},
        ${supplier.supplierCode},
        ${supplier.name},
        ${supplier.contactPerson},
        ${supplier.phone},
        ${supplier.email},
        ${supplier.address},
        ${supplier.paymentTerms},
        false,
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("supplierCode") DO UPDATE SET
        "name" = EXCLUDED."name",
        "contactPerson" = EXCLUDED."contactPerson",
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        address = EXCLUDED.address,
        "paymentTerms" = EXCLUDED."paymentTerms",
        "vatRegistered" = false,
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  const categoryRows = await sql<
    Array<{ id: string; code: string | null }>
  >`SELECT id, code FROM "Category" WHERE "isArchived" = false`;
  const unitRows = await sql<
    Array<{ id: string; code: string | null }>
  >`SELECT id, code FROM "Unit" WHERE "isArchived" = false`;
  const itemTypeRows = await sql<
    Array<{ id: string; code: string }>
  >`SELECT id, code FROM "ItemType" WHERE "isArchived" = false`;
  const taxCodeRows = await sql<
    Array<{ id: string; code: string | null }>
  >`SELECT id, code FROM "TaxCode" WHERE "isArchived" = false`;

  const categoryByCode = new Map(
    categoryRows.map((row) => [row.code ?? "", row.id]),
  );
  const unitByCode = new Map(unitRows.map((row) => [row.code ?? "", row.id]));
  const itemTypeByCode = new Map(itemTypeRows.map((row) => [row.code, row.id]));
  const taxCodeByCode = new Map(
    taxCodeRows.map((row) => [row.code ?? "", row.id]),
  );
  const defaultTaxCodeId = taxCodeByCode.get("VAT16") ?? null;

  for (const item of items) {
    await sql`
      INSERT INTO "Item" (
        "id",
        "itemCode",
        "itemName",
        sku,
        "categoryId",
        "itemTypeId",
        "uomId",
        "reorderPoint",
        "standardCost",
        "sellingPrice",
        "vatApplicable",
        "exciseApplicable",
        "purchaseTaxCodeId",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("item", item.itemCode)},
        ${item.itemCode},
        ${item.itemName},
        ${item.sku},
        ${categoryByCode.get(item.categoryCode) ?? null},
        ${itemTypeByCode.get(item.itemTypeCode) ?? null},
        ${unitByCode.get(item.uomCode) ?? null},
        ${item.reorderPoint},
        ${item.standardCost ?? 0},
        ${item.sellingPrice ?? 0},
        ${item.vatApplicable},
        ${item.exciseApplicable},
        ${defaultTaxCodeId},
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("itemCode") DO UPDATE SET
        "itemName" = EXCLUDED."itemName",
        sku = EXCLUDED.sku,
        "categoryId" = EXCLUDED."categoryId",
        "itemTypeId" = EXCLUDED."itemTypeId",
        "uomId" = EXCLUDED."uomId",
        "reorderPoint" = EXCLUDED."reorderPoint",
        "standardCost" = EXCLUDED."standardCost",
        "sellingPrice" = EXCLUDED."sellingPrice",
        "vatApplicable" = EXCLUDED."vatApplicable",
        "exciseApplicable" = EXCLUDED."exciseApplicable",
        "purchaseTaxCodeId" = EXCLUDED."purchaseTaxCodeId",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const priceList of priceLists) {
    await sql`
      INSERT INTO "PriceList" (
        "id",
        "code",
        "name",
        "currency",
        "customerGroup",
        "price",
        "effectiveFrom",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("pricelist", priceList.code ?? priceList.name ?? "default")},
        ${priceList.code},
        ${priceList.name},
        ${priceList.currency},
        ${priceList.customerGroup},
        ${priceList.price},
        ${priceList.effectiveFrom},
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "currency" = EXCLUDED."currency",
        "customerGroup" = EXCLUDED."customerGroup",
        "price" = EXCLUDED."price",
        "effectiveFrom" = EXCLUDED."effectiveFrom",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const prefix of ["PO", "SO", "GRN", "INV", "PR", "REQ", "ST", "ADJ"]) {
    await sql`
      INSERT INTO "DocumentNumbering" (
        "id",
        "prefix",
        "description",
        "prefixFormat",
        "separator",
        "yearFormat",
        "monthFormat",
        "dayFormat",
        "sequenceLength",
        "currentSequence",
        "isActive",
        "isArchived"
      )
      VALUES (
        ${makeSeedId("docnum", prefix)},
        ${prefix},
        ${titleCase(prefix)},
        ${prefix},
        '-',
        'YYYY',
        'MM',
        'DD',
        4,
        0,
        true,
        false
      )
      ON CONFLICT ("prefix") DO UPDATE SET
        "description" = EXCLUDED."description",
        "prefixFormat" = EXCLUDED."prefixFormat",
        "separator" = EXCLUDED."separator",
        "yearFormat" = EXCLUDED."yearFormat",
        "monthFormat" = EXCLUDED."monthFormat",
        "dayFormat" = EXCLUDED."dayFormat",
        "sequenceLength" = EXCLUDED."sequenceLength",
        "currentSequence" = EXCLUDED."currentSequence",
        "isActive" = true,
        "isArchived" = false
    `;
  }
}

async function seedCompanyAndSettings() {
  const companyRows = await sql<
    Array<{ id: string }>
  >`SELECT "id" FROM "Company" ORDER BY "createdAt" ASC LIMIT 1`;
  if (companyRows[0]) {
    await sql`
      UPDATE "Company"
      SET
        "companyName" = 'NEW ERP',
        "logo" = NULL,
        "address" = 'Nairobi, Kenya',
        "phone" = '+254700000000',
        "email" = 'info@newerp.local',
        "tinNumber" = 'TIN-NEW-ERP',
        "vatNumber" = 'VAT-NEW-ERP',
        "defaultCurrency" = 'ETB',
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
      WHERE "id" = ${companyRows[0].id}
    `;
  } else {
    await sql`
      INSERT INTO "Company" (
        "id",
        "companyName",
        "logo",
        "address",
        "phone",
        "email",
        "tinNumber",
        "vatNumber",
        "defaultCurrency",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("company", "new-erp")},
        'NEW ERP',
        NULL,
        'Nairobi, Kenya',
        '+254700000000',
        'info@newerp.local',
        'TIN-NEW-ERP',
        'VAT-NEW-ERP',
        'ETB',
        true,
        false,
        NOW(),
        NOW()
      )
    `;
  }

  const settings = [
    { key: "company_name", value: "NEW ERP", category: "general" },
    { key: "default_currency", value: "ETB", category: "general" },
    { key: "date_format", value: "DD/MM/YYYY", category: "general" },
    { key: "timezone", value: "Africa/Nairobi", category: "general" },
    { key: "enable_audit_log", value: "true", category: "security" },
  ];

  for (const setting of settings) {
    await sql`
      INSERT INTO "SystemSetting" ("id", "key", "value", "category", "isArchived")
      VALUES (${randomUUID()}, ${setting.key}, ${setting.value}, ${setting.category}, false)
      ON CONFLICT ("key") DO UPDATE SET
        "value" = EXCLUDED."value",
        "category" = EXCLUDED."category",
        "isArchived" = false
    `;
  }
}

async function main() {
  console.log("Seeding database...");

  await seedCompanyAndSettings();
  const permissions = await seedPermissions();
  const roles = await seedRoles(permissions);
  const adminPassword = await bcrypt.hash("1234", 12);
  const adminUserId = await seedUserRecord(
    {
      id: makeSeedId("user", "admin"),
      name: "System Administrator",
      email: "admin@newerp.local",
      username: "admin",
      role: "Super Admin",
      roleId: roles.superAdminId,
      phone: "+254700000000",
    },
    adminPassword,
  );

  const seededLocations = await seedLocations(adminUserId);
  const additionalUsers = await seedAdditionalUsers({
    adminId: roles.adminId,
    userId: roles.userId,
  });

  await seedUserLocations(adminUserId, seededLocations.map((location) => location.id));
  await seedUserLocations(additionalUsers.managerUserId, seededLocations.slice(0, 3).map((location) => location.id));
  await seedUserLocations(additionalUsers.clerkUserId, seededLocations.slice(1, 3).map((location) => location.id));
  await seedMasterData();

  console.log("Seeding complete.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });

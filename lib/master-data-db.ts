import { sql } from "@/lib/db";
import type { Location } from "@/features/administration/types";
import type {
  Bank,
  BankAccount,
  Category,
  Customer,
  Department,
  ItemType,
  PriceList,
  TaxCode,
  Supplier,
  Unit,
} from "@/features/master-data/types";

export async function getCategories(): Promise<Category[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        name: string;
        parentCategoryId: string | null;
        parentCategoryName: string | null;
        description: string | null;
        isActive: boolean;
      }>
    >`
      SELECT
        c.id,
        c.name,
        c."parentCategoryId",
        p.name AS "parentCategoryName",
        c.description,
        c."isActive"
      FROM "Category" c
      LEFT JOIN "Category" p ON p.id = c."parentCategoryId"
      WHERE c."isArchived" = false
      ORDER BY c.name ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      parentCategoryId: row.parentCategoryId ?? undefined,
      parentCategoryName: row.parentCategoryName ?? undefined,
      description: row.description ?? undefined,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}

export async function getCategoryById(id: string): Promise<Category | null> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        name: string;
        parentCategoryId: string | null;
        parentCategoryName: string | null;
        description: string | null;
        isActive: boolean;
      }>
    >`
      SELECT
        c.id,
        c.name,
        c."parentCategoryId",
        p.name AS "parentCategoryName",
        c.description,
        c."isActive"
      FROM "Category" c
      LEFT JOIN "Category" p ON p.id = c."parentCategoryId"
      WHERE c.id = ${id} AND c."isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      parentCategoryId: row.parentCategoryId ?? undefined,
      parentCategoryName: row.parentCategoryName ?? undefined,
      description: row.description ?? undefined,
      isActive: row.isActive,
    };
  } catch {
    return null;
  }
}

export async function getLocations(): Promise<Location[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        locationCode: string;
        locationName: string;
        locationType: string;
        address: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, "locationCode", "locationName", "locationType", address, "isActive"
      FROM "Location"
      WHERE "isArchived" = false
      ORDER BY "locationName" ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      locationCode: row.locationCode,
      locationName: row.locationName,
      locationType: row.locationType,
      address: row.address ?? undefined,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}

export async function getLocationById(id: string): Promise<Location | null> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        locationCode: string;
        locationName: string;
        locationType: string;
        address: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, "locationCode", "locationName", "locationType", address, "isActive"
      FROM "Location"
      WHERE id = ${id} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      locationCode: row.locationCode,
      locationName: row.locationName,
      locationType: row.locationType,
      address: row.address ?? undefined,
      isActive: row.isActive,
    };
  } catch {
    return null;
  }
}

export async function getItemTypes(): Promise<ItemType[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        code: string;
        name: string;
        description: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, code, name, description, "isActive"
      FROM "ItemType"
      WHERE "isArchived" = false
      ORDER BY name ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}

export async function getItemTypeById(id: string): Promise<ItemType | null> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        code: string;
        name: string;
        description: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, code, name, description, "isActive"
      FROM "ItemType"
      WHERE id = ${id} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      description: row.description ?? undefined,
      isActive: row.isActive,
    };
  } catch {
    return null;
  }
}

export async function getUnits(): Promise<Unit[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        name: string;
        abbreviation: string;
        type: string;
        isActive: boolean;
      }>
    >`
      SELECT id, name, abbreviation, type, "isActive"
      FROM "Unit"
      WHERE "isArchived" = false
      ORDER BY name ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      type: row.type,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}

export async function getUnitById(id: string): Promise<Unit | null> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        name: string;
        abbreviation: string;
        type: string;
        isActive: boolean;
      }>
    >`
      SELECT id, name, abbreviation, type, "isActive"
      FROM "Unit"
      WHERE id = ${id} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      type: row.type,
      isActive: row.isActive,
    };
  } catch {
    return null;
  }
}

export async function getCustomers(): Promise<Customer[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        customerCode: string;
        name: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        creditLimit: number | null;
        paymentTerms: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, "customerCode", name, phone, email, address, "creditLimit", "paymentTerms", "isActive"
      FROM "Customer"
      WHERE "isArchived" = false
      ORDER BY name ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      customerCode: row.customerCode,
      name: row.name,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      address: row.address ?? undefined,
      creditLimit: row.creditLimit ?? 0,
      paymentTerms: row.paymentTerms ?? undefined,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}

export async function getCustomerById(id: string): Promise<Customer | null> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        customerCode: string;
        name: string;
        phone: string | null;
        email: string | null;
        address: string | null;
        creditLimit: number | null;
        paymentTerms: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, "customerCode", name, phone, email, address, "creditLimit", "paymentTerms", "isActive"
      FROM "Customer"
      WHERE id = ${id} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      customerCode: row.customerCode,
      name: row.name,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      address: row.address ?? undefined,
      creditLimit: row.creditLimit ?? 0,
      paymentTerms: row.paymentTerms ?? undefined,
      isActive: row.isActive,
    };
  } catch {
    return null;
  }
}

export async function getSuppliers(): Promise<Supplier[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        supplierCode: string;
        name: string;
        contactPerson: string | null;
        phone: string | null;
        email: string | null;
        address: string | null;
        paymentTerms: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, "supplierCode", name, "contactPerson", phone, email, address, "paymentTerms", "isActive"
      FROM "Supplier"
      WHERE "isArchived" = false
      ORDER BY name ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      supplierCode: row.supplierCode,
      name: row.name,
      contactPerson: row.contactPerson ?? undefined,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      address: row.address ?? undefined,
      paymentTerms: row.paymentTerms ?? undefined,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}

export async function getSupplierById(id: string): Promise<Supplier | null> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        supplierCode: string;
        name: string;
        contactPerson: string | null;
        phone: string | null;
        email: string | null;
        address: string | null;
        paymentTerms: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, "supplierCode", name, "contactPerson", phone, email, address, "paymentTerms", "isActive"
      FROM "Supplier"
      WHERE id = ${id} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      supplierCode: row.supplierCode,
      name: row.name,
      contactPerson: row.contactPerson ?? undefined,
      phone: row.phone ?? undefined,
      email: row.email ?? undefined,
      address: row.address ?? undefined,
      paymentTerms: row.paymentTerms ?? undefined,
      isActive: row.isActive,
    };
  } catch {
    return null;
  }
}

export async function getBanks(): Promise<Bank[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        name: string;
        shortName: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, name, "shortName", "isActive"
      FROM "Bank"
      WHERE "isArchived" = false
      ORDER BY name ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      shortName: row.shortName ?? row.name,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}

export async function getBankById(id: string): Promise<Bank | null> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        name: string;
        shortName: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, name, "shortName", "isActive"
      FROM "Bank"
      WHERE id = ${id} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      shortName: row.shortName ?? row.name,
      isActive: row.isActive,
    };
  } catch {
    return null;
  }
}

export async function getBankAccounts(): Promise<BankAccount[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        accountCode: string;
        accountName: string;
        bankId: string;
        bankName: string;
        accountNumber: string;
        branch: string | null;
        swiftCode: string | null;
        currency: string;
        openingBalance: number;
        currentBalance: number;
        isActive: boolean;
      }>
    >`
      SELECT
        ba.id,
        ba."accountCode",
        ba."accountName",
        ba."bankId",
        b.name AS "bankName",
        ba."accountNumber",
        ba.branch,
        ba."swiftCode",
        ba.currency,
        ba."openingBalance",
        ba."currentBalance",
        ba."isActive"
      FROM "BankAccount" ba
      LEFT JOIN "Bank" b ON b.id = ba."bankId"
      WHERE ba."isArchived" = false
      ORDER BY ba."accountName" ASC
    `;

      return rows.map((row) => ({
      id: row.id,
      accountCode: row.accountCode,
      accountName: row.accountName,
      bankId: row.bankId,
      bankName: row.bankName,
      accountNumber: row.accountNumber,
      branch: row.branch ?? undefined,
      swiftCode: row.swiftCode ?? undefined,
      currency: row.currency,
      openingBalance: row.openingBalance,
      currentBalance: row.currentBalance,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}

export async function getBankAccountById(
  id: string,
): Promise<BankAccount | null> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        accountCode: string;
        accountName: string;
        bankId: string;
        bankName: string;
        accountNumber: string;
        branch: string | null;
        swiftCode: string | null;
        currency: string;
        openingBalance: number;
        currentBalance: number;
        isActive: boolean;
      }>
    >`
      SELECT
        ba.id,
        ba."accountCode",
        ba."accountName",
        ba."bankId",
        b.name AS "bankName",
        ba."accountNumber",
        ba.branch,
        ba."swiftCode",
        ba.currency,
        ba."openingBalance",
        ba."currentBalance",
        ba."isActive"
      FROM "BankAccount" ba
      LEFT JOIN "Bank" b ON b.id = ba."bankId"
      WHERE ba.id = ${id} AND ba."isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      accountCode: row.accountCode,
      accountName: row.accountName,
      bankId: row.bankId,
      bankName: row.bankName,
      accountNumber: row.accountNumber,
      branch: row.branch ?? undefined,
      swiftCode: row.swiftCode ?? undefined,
      currency: row.currency,
      openingBalance: row.openingBalance,
      currentBalance: row.currentBalance,
      isActive: row.isActive,
    };
  } catch {
    return null;
  }
}

export async function getDepartments(): Promise<Department[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        name: string;
        code: string;
        managerId: string | null;
        managerName: string | null;
        isActive: boolean;
      }>
    >`
      SELECT
        d.id,
        d.name,
        d.code,
        d."managerId",
        u.name AS "managerName",
        d."isActive"
      FROM "Department" d
      LEFT JOIN "User" u ON u.id = d."managerId"
      WHERE d."isArchived" = false
      ORDER BY d.name ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      code: row.code,
      managerId: row.managerId ?? undefined,
      managerName: row.managerName ?? undefined,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}

export async function getDepartmentById(
  id: string,
): Promise<Department | null> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        name: string;
        code: string;
        managerId: string | null;
        managerName: string | null;
        isActive: boolean;
      }>
    >`
      SELECT
        d.id,
        d.name,
        d.code,
        d."managerId",
        u.name AS "managerName",
        d."isActive"
      FROM "Department" d
      LEFT JOIN "User" u ON u.id = d."managerId"
      WHERE d.id = ${id} AND d."isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      name: row.name,
      code: row.code,
      managerId: row.managerId ?? undefined,
      managerName: row.managerName ?? undefined,
      isActive: row.isActive,
    };
  } catch {
    return null;
  }
}

export async function getTaxCodes(): Promise<TaxCode[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        taxName: string;
        taxType: string;
        rate: number;
        isActive: boolean;
      }>
    >`
      SELECT id, "taxName", "taxType", rate, "isActive"
      FROM "TaxCode"
      WHERE "isArchived" = false
      ORDER BY "taxName" ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      taxName: row.taxName,
      taxType: row.taxType,
      rate: row.rate,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}

export async function getTaxTypes(): Promise<string[]> {
  try {
    const rows = await sql<Array<{ taxType: string }>>`
      SELECT DISTINCT "taxType"
      FROM "TaxCode"
      WHERE "isArchived" = false AND "taxType" IS NOT NULL AND "taxType" <> ''
      ORDER BY "taxType" ASC
    `;

    return rows.map((row) => row.taxType);
  } catch {
    return [];
  }
}

export async function getTaxCodeById(id: string): Promise<TaxCode | null> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        taxName: string;
        taxType: string;
        rate: number;
        isActive: boolean;
      }>
    >`
      SELECT id, "taxName", "taxType", rate, "isActive"
      FROM "TaxCode"
      WHERE id = ${id} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      taxName: row.taxName,
      taxType: row.taxType,
      rate: row.rate,
      isActive: row.isActive,
    };
  } catch {
    return null;
  }
}

export async function getPriceLists(): Promise<PriceList[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        code: string | null;
        name: string | null;
        currency: string;
        customerGroup: string | null;
        price: number | null;
        effectiveDate: Date | null;
        effectiveFrom: Date | null;
        effectiveTo: Date | null;
        customerId: string | null;
        locationId: string | null;
        isActive: boolean;
      }>
    >`
      SELECT
        id,
        code,
        name,
        currency,
        "customerGroup",
        price,
        "effectiveDate",
        "effectiveFrom",
        "effectiveTo",
        "customerId",
        "locationId",
        "isActive"
      FROM "PriceList"
      WHERE "isArchived" = false
      ORDER BY COALESCE(name, code) ASC
    `;

    return rows.map((row) => ({
      id: row.id,
      code: row.code ?? undefined,
      name: row.name ?? undefined,
      currency: row.currency,
      customerGroup: row.customerGroup ?? undefined,
      price: row.price ?? undefined,
      effectiveDate: row.effectiveDate?.toISOString(),
      effectiveFrom: row.effectiveFrom?.toISOString(),
      effectiveTo: row.effectiveTo?.toISOString(),
      customerId: row.customerId ?? undefined,
      locationId: row.locationId ?? undefined,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}

export async function getPriceListById(id: string): Promise<PriceList | null> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        code: string | null;
        name: string | null;
        currency: string;
        customerGroup: string | null;
        price: number | null;
        effectiveDate: Date | null;
        effectiveFrom: Date | null;
        effectiveTo: Date | null;
        customerId: string | null;
        locationId: string | null;
        isActive: boolean;
      }>
    >`
      SELECT
        id,
        code,
        name,
        currency,
        "customerGroup",
        price,
        "effectiveDate",
        "effectiveFrom",
        "effectiveTo",
        "customerId",
        "locationId",
        "isActive"
      FROM "PriceList"
      WHERE id = ${id} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      code: row.code ?? undefined,
      name: row.name ?? undefined,
      currency: row.currency,
      customerGroup: row.customerGroup ?? undefined,
      price: row.price ?? undefined,
      effectiveDate: row.effectiveDate?.toISOString(),
      effectiveFrom: row.effectiveFrom?.toISOString(),
      effectiveTo: row.effectiveTo?.toISOString(),
      customerId: row.customerId ?? undefined,
      locationId: row.locationId ?? undefined,
      isActive: row.isActive,
    };
  } catch {
    return null;
  }
}

export async function getMasterDataSummary(): Promise<{
  totalItems: number;
  totalCustomers: number;
  totalSuppliers: number;
  totalCategories: number;
  totalUnits: number;
}> {
  try {
    const [items, customers, suppliers, categories, units] = await Promise.all([
      sql<[ { count: bigint } ]>`SELECT COUNT(*)::bigint AS count FROM "Item" WHERE "isArchived" = false`,
      sql<[ { count: bigint } ]>`SELECT COUNT(*)::bigint AS count FROM "Customer" WHERE "isArchived" = false`,
      sql<[ { count: bigint } ]>`SELECT COUNT(*)::bigint AS count FROM "Supplier" WHERE "isArchived" = false`,
      sql<[ { count: bigint } ]>`SELECT COUNT(*)::bigint AS count FROM "Category" WHERE "isArchived" = false`,
      sql<[ { count: bigint } ]>`SELECT COUNT(*)::bigint AS count FROM "Unit" WHERE "isArchived" = false`,
    ]);

    return {
      totalItems: Number(items[0]?.count ?? 0),
      totalCustomers: Number(customers[0]?.count ?? 0),
      totalSuppliers: Number(suppliers[0]?.count ?? 0),
      totalCategories: Number(categories[0]?.count ?? 0),
      totalUnits: Number(units[0]?.count ?? 0),
    };
  } catch {
    return {
      totalItems: 0,
      totalCustomers: 0,
      totalSuppliers: 0,
      totalCategories: 0,
      totalUnits: 0,
    };
  }
}

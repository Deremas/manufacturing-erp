import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
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
import type { FleetDriver, FleetTrip, Vehicle } from "@/features/fleet/types";
import {
  getPriceListById as getLivePriceListById,
  getPriceLists as getLivePriceLists,
} from "@/services/master-data/priceListService";

export async function getCategories(): Promise<Category[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        publicId: number;
        name: string;
        parentCategoryId: string | null;
        parentCategoryName: string | null;
        description: string | null;
        isActive: boolean;
      }>
    >`
      SELECT
        c.id,
        c."publicId",
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
        publicId: Number(row.publicId ?? 0),
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
        publicId: number;
        name: string;
        parentCategoryId: string | null;
        parentCategoryName: string | null;
        description: string | null;
        isActive: boolean;
      }>
    >`
      SELECT
        c.id,
        c."publicId",
        c.name,
        c."parentCategoryId",
        p.name AS "parentCategoryName",
        c.description,
        c."isActive"
      FROM "Category" c
      LEFT JOIN "Category" p ON p.id = c."parentCategoryId"
      WHERE ${isPublicIdParam(id) ? sql`c."publicId" = ${Number(id)}` : sql`c.id = ${id}`} AND c."isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
        id: row.id,
        publicId: Number(row.publicId ?? 0),
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
        publicId: number;
        locationCode: string;
        locationName: string;
        locationType: string;
        address: string | null;
        isActive: boolean;
        isQcHoldLocation: boolean;
      }>
    >`
      SELECT id, "publicId", "locationCode", "locationName", "locationType", address, "isActive", "isQcHoldLocation"
      FROM "Location"
      WHERE "isArchived" = false
      ORDER BY "locationName" ASC
    `;

    return rows.map((row) => ({
        id: row.id,
        publicId: Number(row.publicId ?? 0),
      locationCode: row.locationCode,
      locationName: row.locationName,
      locationType: row.locationType,
      address: row.address ?? undefined,
      isActive: row.isActive,
      isQcHoldLocation: row.isQcHoldLocation,
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
        publicId: number;
        locationCode: string;
        locationName: string;
        locationType: string;
        address: string | null;
        isActive: boolean;
        isQcHoldLocation: boolean;
      }>
    >`
      SELECT id, "publicId", "locationCode", "locationName", "locationType", address, "isActive", "isQcHoldLocation"
      FROM "Location"
      WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
        id: row.id,
        publicId: Number(row.publicId ?? 0),
      locationCode: row.locationCode,
      locationName: row.locationName,
      locationType: row.locationType,
      address: row.address ?? undefined,
      isActive: row.isActive,
      isQcHoldLocation: row.isQcHoldLocation,
    };
  } catch {
    return null;
  }
}

export async function getVehicles(): Promise<Vehicle[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        vehicleCode: string;
        plateNumber: string;
        vehicleName: string;
        vehicleType: string | null;
        capacity: number | null;
        isActive: boolean;
      }>
    >`
      SELECT id, "vehicleCode", "plateNumber", "vehicleName", "vehicleType", capacity, "isActive"
      FROM "Vehicle"
      WHERE "isArchived" = false
      ORDER BY "vehicleCode" ASC, "vehicleName" ASC
    `;

    return rows.map((row) => ({
        id: row.id,
        publicId: Number(row.publicId ?? 0),
      vehicleCode: row.vehicleCode,
      plateNumber: row.plateNumber,
      vehicleName: row.vehicleName,
      vehicleType: row.vehicleType ?? undefined,
      capacity: row.capacity ?? undefined,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}

export async function getFleetDrivers(): Promise<FleetDriver[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        driverCode: string;
        fullName: string;
        phone: string | null;
        licenseNumber: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, "driverCode", "fullName", phone, "licenseNumber", "isActive"
      FROM "FleetDriver"
      WHERE "isArchived" = false
      ORDER BY "driverCode" ASC, "fullName" ASC
    `;

    return rows.map((row) => ({
        id: row.id,
        publicId: Number(row.publicId ?? 0),
      driverCode: row.driverCode,
      fullName: row.fullName,
      phone: row.phone ?? undefined,
      licenseNumber: row.licenseNumber ?? undefined,
      isActive: row.isActive,
    }));
  } catch {
    return [];
  }
}

export async function getFleetTrips(): Promise<FleetTrip[]> {
  try {
    const rows = await sql<
      Array<{
        id: string;
        tripNo: string;
        tripDate: string;
        vehicleId: string;
        vehicleCode: string;
        vehicleName: string;
        plateNumber: string;
        driverId: string | null;
        driverCode: string | null;
        driverName: string | null;
        fromLocationId: string | null;
        fromLocationCode: string | null;
        fromLocationName: string | null;
        destinationId: string | null;
        destinationCode: string | null;
        destinationName: string | null;
        routeName: string;
        routeDescription: string | null;
        status: string;
        remarks: string | null;
        isActive: boolean;
      }>
    >`
      SELECT
        trip.id,
        trip."tripNo",
        trip."tripDate"::text AS "tripDate",
        trip."vehicleId",
        vehicle."vehicleCode",
        vehicle."vehicleName",
        vehicle."plateNumber",
        trip."driverId",
        driver."driverCode",
        driver."fullName" AS "driverName",
        trip."fromLocationId",
        from_location."locationCode" AS "fromLocationCode",
        from_location."locationName" AS "fromLocationName",
        trip."destinationId",
        destination."locationCode" AS "destinationCode",
        destination."locationName" AS "destinationName",
        trip."routeName",
        trip."routeDescription",
        trip.status,
        trip.remarks,
        trip."isActive"
      FROM "FleetTrip" trip
      INNER JOIN "Vehicle" vehicle ON vehicle.id = trip."vehicleId"
      LEFT JOIN "FleetDriver" driver ON driver.id = trip."driverId"
      LEFT JOIN "Location" from_location ON from_location.id = trip."fromLocationId"
      LEFT JOIN "Location" destination ON destination.id = trip."destinationId"
      WHERE trip."isArchived" = false
      ORDER BY trip."tripDate" DESC, trip."tripNo" DESC
    `;

    return rows.map((row) => ({
        id: row.id,
        publicId: Number(row.publicId ?? 0),
      tripNo: row.tripNo,
      tripDate: row.tripDate,
      vehicleId: row.vehicleId,
      vehicleCode: row.vehicleCode,
      vehicleName: row.vehicleName,
      plateNumber: row.plateNumber,
      driverId: row.driverId ?? undefined,
      driverCode: row.driverCode ?? undefined,
      driverName: row.driverName ?? undefined,
      fromLocationId: row.fromLocationId ?? undefined,
      fromLocationLabel: row.fromLocationCode
        ? `${row.fromLocationCode} - ${row.fromLocationName ?? ""}`.trim()
        : undefined,
      destinationId: row.destinationId ?? undefined,
      destinationLabel: row.destinationCode
        ? `${row.destinationCode} - ${row.destinationName ?? ""}`.trim()
        : undefined,
      routeName: row.routeName,
      routeDescription: row.routeDescription ?? undefined,
      status: row.status,
      remarks: row.remarks ?? undefined,
      isActive: row.isActive,
    }));
  } catch {
    return [];
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
      SELECT id, "publicId", code, name, description, "isActive"
      FROM "ItemType"
      WHERE "isArchived" = false
      ORDER BY name ASC
    `;

    return rows.map((row) => ({
        id: row.id,
        publicId: Number(row.publicId ?? 0),
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
      SELECT id, "publicId", code, name, description, "isActive"
      FROM "ItemType"
      WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
        id: row.id,
        publicId: Number(row.publicId ?? 0),
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
        code: string | null;
        name: string;
        abbreviation: string;
        type: string;
        decimalPrecision: number | null;
        isActive: boolean;
      }>
    >`
      SELECT id, "publicId", code, name, abbreviation, type, "decimalPrecision", "isActive"
      FROM "Unit"
      WHERE "isArchived" = false
      ORDER BY name ASC
    `;

    return rows.map((row) => ({
        id: row.id,
        publicId: Number(row.publicId ?? 0),
      code: row.code ?? "",
      name: row.name,
      abbreviation: row.abbreviation,
      type: row.type,
      decimalPrecision: row.decimalPrecision ?? 0,
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
        code: string | null;
        name: string;
        abbreviation: string;
        type: string;
        decimalPrecision: number | null;
        isActive: boolean;
      }>
    >`
      SELECT id, "publicId", code, name, abbreviation, type, "decimalPrecision", "isActive"
      FROM "Unit"
      WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
        id: row.id,
        publicId: Number(row.publicId ?? 0),
      code: row.code ?? "",
      name: row.name,
      abbreviation: row.abbreviation,
      type: row.type,
      decimalPrecision: row.decimalPrecision ?? 0,
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
      SELECT id, "publicId", "customerCode", name, phone, email, address, "creditLimit", "paymentTerms", "isActive"
      FROM "Customer"
      WHERE "isArchived" = false
      ORDER BY name ASC
    `;

    return rows.map((row) => ({
        id: row.id,
        publicId: Number(row.publicId ?? 0),
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
      SELECT id, "publicId", "customerCode", name, phone, email, address, "creditLimit", "paymentTerms", "isActive"
      FROM "Customer"
      WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
        id: row.id,
        publicId: Number(row.publicId ?? 0),
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
      SELECT id, "publicId", "supplierCode", name, "contactPerson", phone, email, address, "paymentTerms", "isActive"
      FROM "Supplier"
      WHERE "isArchived" = false
      ORDER BY name ASC
    `;

    return rows.map((row) => ({
        id: row.id,
        publicId: Number(row.publicId ?? 0),
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
      SELECT id, "publicId", "supplierCode", name, "contactPerson", phone, email, address, "paymentTerms", "isActive"
      FROM "Supplier"
      WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
        id: row.id,
        publicId: Number(row.publicId ?? 0),
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
        publicId: number;
        name: string;
        shortName: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, "publicId", name, "shortName", "isActive"
      FROM "Bank"
      WHERE "isArchived" = false
      ORDER BY name ASC
    `;

    return rows.map((row) => ({
        id: row.id,
        publicId: Number(row.publicId ?? 0),
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
        publicId: number;
        name: string;
        shortName: string | null;
        isActive: boolean;
      }>
    >`
      SELECT id, "publicId", name, "shortName", "isActive"
      FROM "Bank"
      WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
        id: row.id,
        publicId: Number(row.publicId ?? 0),
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
        ba."publicId",
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
        publicId: Number(row.publicId ?? 0),
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
        ba."publicId",
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
      WHERE ${isPublicIdParam(id) ? sql`ba."publicId" = ${Number(id)}` : sql`ba.id = ${id}`} AND ba."isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
        id: row.id,
        publicId: Number(row.publicId ?? 0),
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
        publicId: Number(row.publicId ?? 0),
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
      WHERE ${isPublicIdParam(id) ? sql`d."publicId" = ${Number(id)}` : sql`d.id = ${id}`} AND d."isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
        id: row.id,
        publicId: Number(row.publicId ?? 0),
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
        publicId: Number(row.publicId ?? 0),
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
      WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`} AND "isArchived" = false
      LIMIT 1
    `;

    const row = rows[0];
    if (!row) return null;

    return {
        id: row.id,
        publicId: Number(row.publicId ?? 0),
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
  return getLivePriceLists();
}

export async function getPriceListById(id: string): Promise<PriceList | null> {
  return getLivePriceListById(id);
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

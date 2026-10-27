import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { getShiftDefinitions } from "@/services/production/production-shared.service";

export interface EmployeeRecord {
  id: string;
  publicId: number;
  employeeNo: string;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  fullName: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hireDate: string;
  employmentType?: string | null;
  departmentId?: string | null;
  departmentName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  positionTitle?: string | null;
  productionRole?: string | null;
  baseShiftCode?: string | null;
  managerId?: string | null;
  managerName?: string | null;
  bankId?: string | null;
  bankName?: string | null;
  bankAccountNumber?: string | null;
  tin?: string | null;
  pensionNumber?: string | null;
  baseSalary: number;
  status: string;
  userId?: string | null;
  userName?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  guarantorName?: string | null;
  guarantorPhone?: string | null;
  guarantorDocumentUrl?: string | null;
  medicalCertificateExpiry?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeePayload {
  employeeNo?: string | null;
  firstName: string;
  middleName?: string | null;
  lastName: string;
  gender?: string | null;
  dateOfBirth?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  hireDate: string;
  employmentType?: string | null;
  departmentId?: string | null;
  locationId?: string | null;
  positionTitle?: string | null;
  productionRole?: string | null;
  baseShiftCode?: string | null;
  managerId?: string | null;
  bankId?: string | null;
  bankAccountNumber?: string | null;
  tin?: string | null;
  pensionNumber?: string | null;
  baseSalary?: number;
  status?: string | null;
  userId?: string | null;
  emergencyContactName?: string | null;
  emergencyContactPhone?: string | null;
  guarantorName?: string | null;
  guarantorPhone?: string | null;
  guarantorDocumentUrl?: string | null;
  medicalCertificateExpiry?: string | null;
  isActive?: boolean;
}

export interface EmployeeOption {
  value: string;
  label: string;
}

export interface HrAttendanceRow {
  id: string;
  shiftSessionId: string;
  attendanceDate: string;
  shiftCode: string;
  locationId: string;
  locationName: string;
  employeeId?: string | null;
  employeeNo?: string | null;
  employeeName: string;
  userId: string;
  role?: string | null;
  present: boolean;
  remarks?: string | null;
}

function normalizeNullableString(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function mapEmployeeStatus(value: string | null | undefined) {
  const normalized = String(value ?? "").trim().toUpperCase();
  return ["ACTIVE", "INACTIVE", "SUSPENDED", "TERMINATED"].includes(normalized)
    ? normalized
    : "ACTIVE";
}

function mapEmployee(row: Record<string, unknown>): EmployeeRecord {
  return {
    id: String(row.id),
    publicId: Number(row.publicId ?? 0),
    employeeNo: String(row.employeeNo),
    firstName: String(row.firstName),
    middleName: row.middleName ? String(row.middleName) : null,
    lastName: String(row.lastName),
    fullName: String(row.fullName),
    gender: row.gender ? String(row.gender) : null,
    dateOfBirth: row.dateOfBirth ? String(row.dateOfBirth) : null,
    phone: row.phone ? String(row.phone) : null,
    email: row.email ? String(row.email) : null,
    address: row.address ? String(row.address) : null,
    hireDate: String(row.hireDate),
    employmentType: row.employmentType ? String(row.employmentType) : null,
    departmentId: row.departmentId ? String(row.departmentId) : null,
    departmentName: row.departmentName ? String(row.departmentName) : null,
    locationId: row.locationId ? String(row.locationId) : null,
    locationName: row.locationName ? String(row.locationName) : null,
    positionTitle: row.positionTitle ? String(row.positionTitle) : null,
    productionRole: row.productionRole ? String(row.productionRole) : null,
    baseShiftCode: row.baseShiftCode ? String(row.baseShiftCode) : null,
    managerId: row.managerId ? String(row.managerId) : null,
    managerName: row.managerName ? String(row.managerName) : null,
    bankId: row.bankId ? String(row.bankId) : null,
    bankName: row.bankName ? String(row.bankName) : null,
    bankAccountNumber: row.bankAccountNumber ? String(row.bankAccountNumber) : null,
    tin: row.tin ? String(row.tin) : null,
    pensionNumber: row.pensionNumber ? String(row.pensionNumber) : null,
    baseSalary: Number(row.baseSalary ?? 0),
    status: String(row.status ?? "ACTIVE"),
    userId: row.userId ? String(row.userId) : null,
    userName: row.userName ? String(row.userName) : null,
    emergencyContactName: row.emergencyContactName ? String(row.emergencyContactName) : null,
    emergencyContactPhone: row.emergencyContactPhone ? String(row.emergencyContactPhone) : null,
    guarantorName: row.guarantorName ? String(row.guarantorName) : null,
    guarantorPhone: row.guarantorPhone ? String(row.guarantorPhone) : null,
    guarantorDocumentUrl: row.guarantorDocumentUrl ? String(row.guarantorDocumentUrl) : null,
    medicalCertificateExpiry: row.medicalCertificateExpiry ? String(row.medicalCertificateExpiry) : null,
    isActive: Boolean(row.isActive),
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export async function listEmployees() {
  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT
      e.id,
      e."publicId",
      e."employeeNo",
      e."firstName",
      e."middleName",
      e."lastName",
      CONCAT_WS(' ', e."firstName", e."middleName", e."lastName") AS "fullName",
      e.gender,
      e."dateOfBirth"::text AS "dateOfBirth",
      e.phone,
      e.email,
      e.address,
      e."hireDate"::text AS "hireDate",
      e."employmentType",
      e."departmentId",
      d.name AS "departmentName",
      e."locationId",
      l."locationName",
      e."positionTitle",
      e."productionRole",
      e."baseShiftCode",
      e."managerId",
      m.name AS "managerName",
      e."bankId",
      b.name AS "bankName",
      e."bankAccountNumber",
      e.tin,
      e."pensionNumber",
      e."baseSalary",
      e.status::text AS status,
      e."userId",
      u.name AS "userName",
      e."emergencyContactName",
      e."emergencyContactPhone",
      e."guarantorName",
      e."guarantorPhone",
      e."guarantorDocumentUrl",
      e."medicalCertificateExpiry"::text AS "medicalCertificateExpiry",
      e."isActive",
      e."createdAt"::text AS "createdAt",
      e."updatedAt"::text AS "updatedAt"
    FROM "Employee" e
    LEFT JOIN "Department" d ON d.id = e."departmentId"
    LEFT JOIN "Location" l ON l.id = e."locationId"
    LEFT JOIN "User" m ON m.id = e."managerId"
    LEFT JOIN "Bank" b ON b.id = e."bankId"
    LEFT JOIN "User" u ON u.id = e."userId"
    WHERE e."isArchived" = false
    ORDER BY e."employeeNo" ASC, e."firstName" ASC, e."lastName" ASC
  `;

  return rows.map(mapEmployee);
}

export async function getEmployeeById(key: string) {
  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT
      e.id,
      e."publicId",
      e."employeeNo",
      e."firstName",
      e."middleName",
      e."lastName",
      CONCAT_WS(' ', e."firstName", e."middleName", e."lastName") AS "fullName",
      e.gender,
      e."dateOfBirth"::text AS "dateOfBirth",
      e.phone,
      e.email,
      e.address,
      e."hireDate"::text AS "hireDate",
      e."employmentType",
      e."departmentId",
      d.name AS "departmentName",
      e."locationId",
      l."locationName",
      e."positionTitle",
      e."productionRole",
      e."baseShiftCode",
      e."managerId",
      m.name AS "managerName",
      e."bankId",
      b.name AS "bankName",
      e."bankAccountNumber",
      e.tin,
      e."pensionNumber",
      e."baseSalary",
      e.status::text AS status,
      e."userId",
      u.name AS "userName",
      e."emergencyContactName",
      e."emergencyContactPhone",
      e."guarantorName",
      e."guarantorPhone",
      e."guarantorDocumentUrl",
      e."medicalCertificateExpiry"::text AS "medicalCertificateExpiry",
      e."isActive",
      e."createdAt"::text AS "createdAt",
      e."updatedAt"::text AS "updatedAt"
    FROM "Employee" e
    LEFT JOIN "Department" d ON d.id = e."departmentId"
    LEFT JOIN "Location" l ON l.id = e."locationId"
    LEFT JOIN "User" m ON m.id = e."managerId"
    LEFT JOIN "Bank" b ON b.id = e."bankId"
    LEFT JOIN "User" u ON u.id = e."userId"
    WHERE ${isPublicIdParam(key) ? sql`e."publicId" = ${Number(key)}` : sql`e.id = ${key}`}
      AND e."isArchived" = false
    LIMIT 1
  `;

  return rows[0] ? mapEmployee(rows[0]) : null;
}

export async function getNextEmployeeNumber() {
  const rows = await sql<Array<{ employeeNo: string }>>`
    SELECT "employeeNo"
    FROM "Employee"
    WHERE "employeeNo" LIKE 'EMP-%'
    ORDER BY "createdAt" DESC
    LIMIT 250
  `;

  let max = 0;
  for (const row of rows) {
    const match = row.employeeNo.match(/EMP-(\d+)/i);
    if (!match) continue;
    max = Math.max(max, Number(match[1]));
  }

  return `EMP-${String(max + 1).padStart(4, "0")}`;
}

async function validateForeignKeys(payload: EmployeePayload) {
  const checks = [
    payload.departmentId
      ? sql<Array<{ id: string }>>`SELECT id FROM "Department" WHERE id = ${payload.departmentId} AND "isArchived" = false LIMIT 1`
      : Promise.resolve([]),
    payload.locationId
      ? sql<Array<{ id: string }>>`SELECT id FROM "Location" WHERE id = ${payload.locationId} AND "isArchived" = false LIMIT 1`
      : Promise.resolve([]),
    payload.managerId
      ? sql<Array<{ id: string }>>`SELECT id FROM "User" WHERE id = ${payload.managerId} AND "isArchived" = false LIMIT 1`
      : Promise.resolve([]),
    payload.bankId
      ? sql<Array<{ id: string }>>`SELECT id FROM "Bank" WHERE id = ${payload.bankId} AND "isArchived" = false LIMIT 1`
      : Promise.resolve([]),
    payload.userId
      ? sql<Array<{ id: string }>>`SELECT id FROM "User" WHERE id = ${payload.userId} AND "isArchived" = false LIMIT 1`
      : Promise.resolve([]),
  ] as const;

  const [departmentRows, locationRows, managerRows, bankRows, userRows] = await Promise.all(checks);

  if (payload.departmentId && !departmentRows[0]) {
    throw new Error("Selected department was not found.");
  }
  if (payload.locationId && !locationRows[0]) {
    throw new Error("Selected location was not found.");
  }
  if (payload.managerId && !managerRows[0]) {
    throw new Error("Selected manager was not found.");
  }
  if (payload.bankId && !bankRows[0]) {
    throw new Error("Selected bank was not found.");
  }
  if (payload.userId && !userRows[0]) {
    throw new Error("Selected user account was not found.");
  }
}

export async function createEmployee(payload: EmployeePayload, currentUserId: string) {
  await validateForeignKeys(payload);

  const employeeNo = normalizeNullableString(payload.employeeNo) ?? (await getNextEmployeeNumber());
  const duplicateRows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "Employee"
    WHERE "employeeNo" = ${employeeNo}
      AND "isArchived" = false
    LIMIT 1
  `;
  if (duplicateRows[0]) {
    throw new Error(`Employee number ${employeeNo} already exists.`);
  }

  if (payload.userId) {
    const linkedRows = await sql<Array<{ id: string }>>`
      SELECT id
      FROM "Employee"
      WHERE "userId" = ${payload.userId}
        AND "isArchived" = false
      LIMIT 1
    `;
    if (linkedRows[0]) {
      throw new Error("The selected user account is already linked to another employee.");
    }
  }

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO "Employee" (
      "employeeNo", "firstName", "middleName", "lastName", gender, "dateOfBirth",
      phone, email, address, "hireDate", "employmentType", "departmentId", "locationId",
      "positionTitle", "productionRole", "baseShiftCode", "managerId", "bankId",
      "bankAccountNumber", tin, "pensionNumber", "baseSalary", status, "userId",
      "emergencyContactName", "emergencyContactPhone", "guarantorName", "guarantorPhone",
      "guarantorDocumentUrl", "medicalCertificateExpiry", "isActive", "isArchived",
      "createdById", "updatedById", "createdAt", "updatedAt"
    )
    VALUES (
      ${employeeNo},
      ${payload.firstName.trim()},
      ${normalizeNullableString(payload.middleName)},
      ${payload.lastName.trim()},
      ${normalizeNullableString(payload.gender)},
      ${payload.dateOfBirth ? new Date(payload.dateOfBirth) : null},
      ${normalizeNullableString(payload.phone)},
      ${normalizeNullableString(payload.email)},
      ${normalizeNullableString(payload.address)},
      ${new Date(payload.hireDate)},
      ${normalizeNullableString(payload.employmentType)},
      ${normalizeNullableString(payload.departmentId)},
      ${normalizeNullableString(payload.locationId)},
      ${normalizeNullableString(payload.positionTitle)},
      ${normalizeNullableString(payload.productionRole)},
      ${normalizeNullableString(payload.baseShiftCode)},
      ${normalizeNullableString(payload.managerId)},
      ${normalizeNullableString(payload.bankId)},
      ${normalizeNullableString(payload.bankAccountNumber)},
      ${normalizeNullableString(payload.tin)},
      ${normalizeNullableString(payload.pensionNumber)},
      ${Number(payload.baseSalary ?? 0)},
      ${mapEmployeeStatus(payload.status)},
      ${normalizeNullableString(payload.userId)},
      ${normalizeNullableString(payload.emergencyContactName)},
      ${normalizeNullableString(payload.emergencyContactPhone)},
      ${normalizeNullableString(payload.guarantorName)},
      ${normalizeNullableString(payload.guarantorPhone)},
      ${normalizeNullableString(payload.guarantorDocumentUrl)},
      ${payload.medicalCertificateExpiry ? new Date(payload.medicalCertificateExpiry) : null},
      ${payload.isActive !== false},
      false,
      ${currentUserId},
      ${currentUserId},
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0]?.id ?? null;
}

export async function updateEmployee(id: string, payload: EmployeePayload, currentUserId: string) {
  await validateForeignKeys(payload);

  const existing = await getEmployeeById(id);
  if (!existing) {
    throw new Error("Employee not found.");
  }

  const employeeNo = normalizeNullableString(payload.employeeNo) ?? existing.employeeNo;
  const duplicateRows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "Employee"
    WHERE "employeeNo" = ${employeeNo}
      AND id <> ${id}
      AND "isArchived" = false
    LIMIT 1
  `;
  if (duplicateRows[0]) {
    throw new Error(`Employee number ${employeeNo} already exists.`);
  }

  if (payload.userId) {
    const linkedRows = await sql<Array<{ id: string }>>`
      SELECT id
      FROM "Employee"
      WHERE "userId" = ${payload.userId}
        AND id <> ${id}
        AND "isArchived" = false
      LIMIT 1
    `;
    if (linkedRows[0]) {
      throw new Error("The selected user account is already linked to another employee.");
    }
  }

  await sql`
    UPDATE "Employee"
    SET
      "employeeNo" = ${employeeNo},
      "firstName" = ${payload.firstName.trim()},
      "middleName" = ${normalizeNullableString(payload.middleName)},
      "lastName" = ${payload.lastName.trim()},
      gender = ${normalizeNullableString(payload.gender)},
      "dateOfBirth" = ${payload.dateOfBirth ? new Date(payload.dateOfBirth) : null},
      phone = ${normalizeNullableString(payload.phone)},
      email = ${normalizeNullableString(payload.email)},
      address = ${normalizeNullableString(payload.address)},
      "hireDate" = ${new Date(payload.hireDate)},
      "employmentType" = ${normalizeNullableString(payload.employmentType)},
      "departmentId" = ${normalizeNullableString(payload.departmentId)},
      "locationId" = ${normalizeNullableString(payload.locationId)},
      "positionTitle" = ${normalizeNullableString(payload.positionTitle)},
      "productionRole" = ${normalizeNullableString(payload.productionRole)},
      "baseShiftCode" = ${normalizeNullableString(payload.baseShiftCode)},
      "managerId" = ${normalizeNullableString(payload.managerId)},
      "bankId" = ${normalizeNullableString(payload.bankId)},
      "bankAccountNumber" = ${normalizeNullableString(payload.bankAccountNumber)},
      tin = ${normalizeNullableString(payload.tin)},
      "pensionNumber" = ${normalizeNullableString(payload.pensionNumber)},
      "baseSalary" = ${Number(payload.baseSalary ?? 0)},
      status = ${mapEmployeeStatus(payload.status)},
      "userId" = ${normalizeNullableString(payload.userId)},
      "emergencyContactName" = ${normalizeNullableString(payload.emergencyContactName)},
      "emergencyContactPhone" = ${normalizeNullableString(payload.emergencyContactPhone)},
      "guarantorName" = ${normalizeNullableString(payload.guarantorName)},
      "guarantorPhone" = ${normalizeNullableString(payload.guarantorPhone)},
      "guarantorDocumentUrl" = ${normalizeNullableString(payload.guarantorDocumentUrl)},
      "medicalCertificateExpiry" = ${payload.medicalCertificateExpiry ? new Date(payload.medicalCertificateExpiry) : null},
      "isActive" = ${payload.isActive !== false},
      "updatedById" = ${currentUserId},
      "updatedAt" = NOW()
    WHERE id = ${id}
      AND "isArchived" = false
  `;

  return id;
}

export async function getEmployeeFormOptions() {
  const [departments, locations, banks, users, shiftDefinitions, nextEmployeeNo] = await Promise.all([
    sql<Array<{ value: string; label: string }>>`
      SELECT id AS value, CONCAT(code, ' - ', name) AS label
      FROM "Department"
      WHERE "isArchived" = false AND "isActive" = true
      ORDER BY name ASC
    `,
    sql<Array<{ value: string; label: string }>>`
      SELECT id AS value, CONCAT("locationCode", ' - ', "locationName") AS label
      FROM "Location"
      WHERE "isArchived" = false AND "isActive" = true
      ORDER BY "locationName" ASC
    `,
    sql<Array<{ value: string; label: string }>>`
      SELECT id AS value, CONCAT(COALESCE(code, name), ' - ', name) AS label
      FROM "Bank"
      WHERE "isArchived" = false AND "isActive" = true
      ORDER BY name ASC
    `,
    sql<Array<{ value: string; label: string }>>`
      SELECT id AS value, CONCAT(name, ' - ', email) AS label
      FROM "User"
      WHERE "isArchived" = false AND "isActive" = true
      ORDER BY name ASC
    `,
    getShiftDefinitions(),
    getNextEmployeeNumber(),
  ]);

  return {
    nextEmployeeNo,
    departments,
    locations,
    banks,
    users,
    shiftDefinitions: shiftDefinitions.map((shift) => ({
      value: shift.code,
      label: `${shift.code} - ${shift.name}`,
    })),
  };
}

export async function listAttendance(scope?: { accessibleLocationIds?: string[] | null }) {
  const locationIds = scope?.accessibleLocationIds?.filter(Boolean) ?? [];
  const locationScope =
    locationIds.length > 0
      ? sql`AND ss."locationId" IN ${sql(locationIds)}`
      : sql``;

  return sql<Array<HrAttendanceRow>>`
    SELECT
      sa.id,
      sa."shiftSessionId",
      ss."productionDate"::text AS "attendanceDate",
      ss."shiftCode",
      l.id AS "locationId",
      l."locationName",
      e.id AS "employeeId",
      e."employeeNo",
      COALESCE(CONCAT_WS(' ', e."firstName", e."middleName", e."lastName"), u.name, u.email) AS "employeeName",
      u.id AS "userId",
      sa.role,
      sa.present,
      sa.remarks
    FROM "ShiftAttendance" sa
    INNER JOIN "ShiftSession" ss ON ss.id = sa."shiftSessionId"
    INNER JOIN "Location" l ON l.id = ss."locationId"
    INNER JOIN "User" u ON u.id = sa."userId"
    LEFT JOIN "Employee" e ON e."userId" = u.id AND e."isArchived" = false
    WHERE 1 = 1
    ${locationScope}
    ORDER BY ss."productionDate" DESC, ss."shiftCode" ASC, l."locationName" ASC, "employeeName" ASC
  `;
}

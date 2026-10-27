import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { getShiftDefinitions } from "@/services/production/production-shared.service";
import { getPayrollSettings, resolveOvertimeMultiplier, resolvePayrollDayType } from "@/services/hr/payroll.service";

export interface OvertimeRecord {
  id: string;
  publicId: number;
  overtimeNo: string;
  employeeId: string;
  employeeNo?: string | null;
  employeeName: string;
  departmentId?: string | null;
  departmentName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  overtimeDate: string;
  shiftCode?: string | null;
  attendanceReferenceId?: string | null;
  hours: number;
  reason?: string | null;
  requestedById?: string | null;
  requestedByName?: string | null;
  approvedById?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  dayType?: string | null;
  rateMultiplier: number;
  amount: number;
  status: string;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface OvertimePayload {
  employeeId: string;
  overtimeDate: string;
  shiftCode?: string | null;
  attendanceReferenceId?: string | null;
  hours: number;
  reason?: string | null;
  rateMultiplier?: number | null;
  remarks?: string | null;
}

function normalizeNullableString(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function mapOvertime(row: Record<string, unknown>): OvertimeRecord {
  return {
    id: String(row.id),
    publicId: Number(row.publicId ?? 0),
    overtimeNo: String(row.overtimeNo),
    employeeId: String(row.employeeId),
    employeeNo: row.employeeNo ? String(row.employeeNo) : null,
    employeeName: String(row.employeeName),
    departmentId: row.departmentId ? String(row.departmentId) : null,
    departmentName: row.departmentName ? String(row.departmentName) : null,
    locationId: row.locationId ? String(row.locationId) : null,
    locationName: row.locationName ? String(row.locationName) : null,
    overtimeDate: String(row.overtimeDate),
    shiftCode: row.shiftCode ? String(row.shiftCode) : null,
    attendanceReferenceId: row.attendanceReferenceId ? String(row.attendanceReferenceId) : null,
    hours: Number(row.hours ?? 0),
    reason: row.reason ? String(row.reason) : null,
    requestedById: row.requestedById ? String(row.requestedById) : null,
    requestedByName: row.requestedByName ? String(row.requestedByName) : null,
    approvedById: row.approvedById ? String(row.approvedById) : null,
    approvedByName: row.approvedByName ? String(row.approvedByName) : null,
    approvedAt: row.approvedAt ? String(row.approvedAt) : null,
    dayType: row.dayType ? String(row.dayType) : null,
    rateMultiplier: Number(row.rateMultiplier ?? 0),
    amount: Number(row.amount ?? 0),
    status: String(row.status ?? "DRAFT"),
    remarks: row.remarks ? String(row.remarks) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

async function getEmployeeForOvertime(employeeId: string) {
  const rows = await sql<Array<{
    id: string;
    employeeNo: string;
    baseSalary: number;
    departmentId: string | null;
    locationId: string | null;
  }>>`
    SELECT id, "employeeNo", "baseSalary", "departmentId", "locationId"
    FROM "Employee"
    WHERE id = ${employeeId}
      AND "isArchived" = false
      AND "isActive" = true
    LIMIT 1
  `;

  return rows[0] ?? null;
}

function calculateOvertimeAmount(baseSalary: number, hours: number, multiplier: number, standardWorkDaysPerMonth: number) {
  const divisor = standardWorkDaysPerMonth > 0 ? standardWorkDaysPerMonth : 30;
  const hourlyRate = Number(baseSalary ?? 0) / divisor / 8;
  return Number((hourlyRate * hours * multiplier).toFixed(2));
}

export async function getNextOvertimeNumber() {
  const rows = await sql<Array<{ overtimeNo: string }>>`
    SELECT "overtimeNo"
    FROM "OvertimeRequest"
    WHERE "overtimeNo" LIKE 'OT-%'
    ORDER BY "createdAt" DESC
    LIMIT 250
  `;

  let max = 0;
  for (const row of rows) {
    const match = row.overtimeNo.match(/OT-(\d+)/i);
    if (!match) continue;
    max = Math.max(max, Number(match[1]));
  }

  return `OT-${String(max + 1).padStart(4, "0")}`;
}

export async function listOvertimeRequests(scope?: { accessibleLocationIds?: string[] | null }) {
  const payrollSettings = await getPayrollSettings();
  const locationIds = scope?.accessibleLocationIds?.filter(Boolean) ?? [];
  const locationScope = locationIds.length
    ? sql`AND (ot."locationId" IS NULL OR ot."locationId" IN ${sql(locationIds)})`
    : sql``;

  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT
      ot.id,
      ot."publicId",
      ot."overtimeNo",
      ot."employeeId",
      e."employeeNo",
      CONCAT_WS(' ', e."firstName", e."middleName", e."lastName") AS "employeeName",
      ot."departmentId",
      d.name AS "departmentName",
      ot."locationId",
      l."locationName",
      ot."overtimeDate"::text AS "overtimeDate",
      ot."shiftCode",
      ot."attendanceReferenceId",
      ot.hours,
      ot.reason,
      ot."requestedById",
      ru.name AS "requestedByName",
      ot."approvedById",
      au.name AS "approvedByName",
      ot."approvedAt"::text AS "approvedAt",
      ot."rateMultiplier",
      ot.amount,
      ot.status::text AS status,
      ot.remarks,
      ot."createdAt"::text AS "createdAt",
      ot."updatedAt"::text AS "updatedAt"
    FROM "OvertimeRequest" ot
    INNER JOIN "Employee" e ON e.id = ot."employeeId"
    LEFT JOIN "Department" d ON d.id = ot."departmentId"
    LEFT JOIN "Location" l ON l.id = ot."locationId"
    LEFT JOIN "User" ru ON ru.id = ot."requestedById"
    LEFT JOIN "User" au ON au.id = ot."approvedById"
    WHERE ot."isArchived" = false
    ${locationScope}
    ORDER BY ot."overtimeDate" DESC, ot."createdAt" DESC
  `;

  return rows.map((row) => mapOvertime({
    ...row,
    dayType: resolvePayrollDayType(String(row.overtimeDate), payrollSettings),
  }));
}

export async function getOvertimeRequestById(key: string) {
  const payrollSettings = await getPayrollSettings();
  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT
      ot.id,
      ot."publicId",
      ot."overtimeNo",
      ot."employeeId",
      e."employeeNo",
      CONCAT_WS(' ', e."firstName", e."middleName", e."lastName") AS "employeeName",
      ot."departmentId",
      d.name AS "departmentName",
      ot."locationId",
      l."locationName",
      ot."overtimeDate"::text AS "overtimeDate",
      ot."shiftCode",
      ot."attendanceReferenceId",
      ot.hours,
      ot.reason,
      ot."requestedById",
      ru.name AS "requestedByName",
      ot."approvedById",
      au.name AS "approvedByName",
      ot."approvedAt"::text AS "approvedAt",
      ot."rateMultiplier",
      ot.amount,
      ot.status::text AS status,
      ot.remarks,
      ot."createdAt"::text AS "createdAt",
      ot."updatedAt"::text AS "updatedAt"
    FROM "OvertimeRequest" ot
    INNER JOIN "Employee" e ON e.id = ot."employeeId"
    LEFT JOIN "Department" d ON d.id = ot."departmentId"
    LEFT JOIN "Location" l ON l.id = ot."locationId"
    LEFT JOIN "User" ru ON ru.id = ot."requestedById"
    LEFT JOIN "User" au ON au.id = ot."approvedById"
    WHERE ${isPublicIdParam(key) ? sql`ot."publicId" = ${Number(key)}` : sql`ot.id = ${key}`}
      AND ot."isArchived" = false
    LIMIT 1
  `;

  return rows[0] ? mapOvertime({
    ...rows[0],
    dayType: resolvePayrollDayType(String(rows[0].overtimeDate), payrollSettings),
  }) : null;
}

async function resolveOvertimeReasons() {
  const rows = await sql<Array<{ value: string }>>`
    SELECT value
    FROM "ModuleSetting"
    WHERE module = 'hr'
      AND key = 'overtimeReasons'
      AND "isArchived" = false
    LIMIT 1
  `;

  const raw = String(rows[0]?.value ?? "[]");
  try {
    const parsed = JSON.parse(raw) as string[];
    return parsed
      .map((value) => String(value).trim())
      .filter(Boolean)
      .map((value) => ({ value, label: value }));
  } catch {
    return [];
  }
}

export async function getOvertimeReferenceData() {
  const [employees, reasons, shiftDefinitions, nextOvertimeNo, payrollSettings] = await Promise.all([
    sql<Array<{ value: string; label: string }>>`
      SELECT
        e.id AS value,
        CONCAT(e."employeeNo", ' - ', CONCAT_WS(' ', e."firstName", e."middleName", e."lastName")) AS label
      FROM "Employee" e
      WHERE e."isArchived" = false
        AND e."isActive" = true
      ORDER BY e."employeeNo" ASC
    `,
    resolveOvertimeReasons(),
    getShiftDefinitions(),
    getNextOvertimeNumber(),
    getPayrollSettings(),
  ]);

  return {
    nextOvertimeNo,
    employees,
    reasons,
    shifts: shiftDefinitions.map((shift) => ({
      value: shift.code,
      label: `${shift.code} - ${shift.name}`,
    })),
    overtimeRules: {
      normalDayMultiplier: payrollSettings.normalDayOvertimeMultiplier,
      weekendMultiplier: payrollSettings.weekendOvertimeMultiplier,
      holidayMultiplier: payrollSettings.holidayOvertimeMultiplier,
      weekendDays: payrollSettings.weekendDays,
      holidayDates: payrollSettings.holidayDates,
    },
  };
}

function validatePayload(payload: OvertimePayload) {
  if (!payload.employeeId) {
    throw new Error("Employee is required.");
  }
  if (!payload.overtimeDate) {
    throw new Error("Overtime date is required.");
  }
  if (!Number.isFinite(Number(payload.hours)) || Number(payload.hours) <= 0) {
    throw new Error("Overtime hours must be greater than zero.");
  }
}

export async function createOvertimeRequest(payload: OvertimePayload, currentUserId: string) {
  validatePayload(payload);
  const employee = await getEmployeeForOvertime(payload.employeeId);
  if (!employee) {
    throw new Error("Selected employee was not found.");
  }

  const overtimeNo = await getNextOvertimeNumber();
  const payrollSettings = await getPayrollSettings();
  const requestedMultiplier = Number(payload.rateMultiplier ?? 0);
  const rateMultiplier = requestedMultiplier > 0 ? requestedMultiplier : resolveOvertimeMultiplier(payload.overtimeDate, payrollSettings);
  const hours = Number(payload.hours);
  const amount = calculateOvertimeAmount(Number(employee.baseSalary ?? 0), hours, rateMultiplier, payrollSettings.standardWorkDaysPerMonth);

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO "OvertimeRequest" (
      "overtimeNo",
      "employeeId",
      "departmentId",
      "locationId",
      "overtimeDate",
      "shiftCode",
      "attendanceReferenceId",
      hours,
      reason,
      "requestedById",
      "rateMultiplier",
      amount,
      status,
      remarks,
      "isArchived",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${overtimeNo},
      ${payload.employeeId},
      ${employee.departmentId},
      ${employee.locationId},
      ${new Date(payload.overtimeDate)},
      ${normalizeNullableString(payload.shiftCode)},
      ${normalizeNullableString(payload.attendanceReferenceId)},
      ${hours},
      ${normalizeNullableString(payload.reason)},
      ${currentUserId},
      ${rateMultiplier},
      ${amount},
      'DRAFT',
      ${normalizeNullableString(payload.remarks)},
      false,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0]?.id ?? null;
}

export async function updateOvertimeRequest(id: string, payload: OvertimePayload) {
  validatePayload(payload);
  const existing = await getOvertimeRequestById(id);
  if (!existing) {
    throw new Error("Overtime request not found.");
  }
  if (!["DRAFT", "SUBMITTED"].includes(existing.status)) {
    throw new Error("Only draft or submitted overtime requests can be edited.");
  }

  const employee = await getEmployeeForOvertime(payload.employeeId);
  if (!employee) {
    throw new Error("Selected employee was not found.");
  }

  const payrollSettings = await getPayrollSettings();
  const requestedMultiplier = Number(payload.rateMultiplier ?? 0);
  const rateMultiplier = requestedMultiplier > 0
    ? requestedMultiplier
    : resolveOvertimeMultiplier(payload.overtimeDate, payrollSettings);
  const hours = Number(payload.hours);
  const amount = calculateOvertimeAmount(Number(employee.baseSalary ?? 0), hours, rateMultiplier, payrollSettings.standardWorkDaysPerMonth);

  await sql`
    UPDATE "OvertimeRequest"
    SET
      "employeeId" = ${payload.employeeId},
      "departmentId" = ${employee.departmentId},
      "locationId" = ${employee.locationId},
      "overtimeDate" = ${new Date(payload.overtimeDate)},
      "shiftCode" = ${normalizeNullableString(payload.shiftCode)},
      "attendanceReferenceId" = ${normalizeNullableString(payload.attendanceReferenceId)},
      hours = ${hours},
      reason = ${normalizeNullableString(payload.reason)},
      "rateMultiplier" = ${rateMultiplier},
      amount = ${amount},
      remarks = ${normalizeNullableString(payload.remarks)},
      "updatedAt" = NOW()
    WHERE id = ${id}
      AND "isArchived" = false
  `;

  return id;
}

export async function changeOvertimeStatus(input: {
  id: string;
  action: "submit" | "approve" | "reject" | "cancel";
  userId: string;
}) {
  const existing = await getOvertimeRequestById(input.id);
  if (!existing) {
    throw new Error("Overtime request not found.");
  }

  if (input.action === "submit") {
    if (existing.status !== "DRAFT") {
      throw new Error("Only draft overtime requests can be submitted.");
    }
    await sql`
      UPDATE "OvertimeRequest"
      SET status = 'SUBMITTED', "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    return;
  }

  if (input.action === "cancel") {
    if (!["DRAFT", "SUBMITTED"].includes(existing.status)) {
      throw new Error("Only draft or submitted overtime requests can be cancelled.");
    }
    await sql`
      UPDATE "OvertimeRequest"
      SET status = 'CANCELLED', "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    return;
  }

  if (input.action === "reject") {
    if (!["DRAFT", "SUBMITTED"].includes(existing.status)) {
      throw new Error("Only open overtime requests can be rejected.");
    }
    await sql`
      UPDATE "OvertimeRequest"
      SET status = 'REJECTED', "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    return;
  }

  if (existing.status !== "SUBMITTED") {
    throw new Error("Only submitted overtime requests can be approved.");
  }

  await sql`
    UPDATE "OvertimeRequest"
    SET
      status = 'APPROVED',
      "approvedById" = ${input.userId},
      "approvedAt" = NOW(),
      "updatedAt" = NOW()
    WHERE id = ${input.id}
  `;
}

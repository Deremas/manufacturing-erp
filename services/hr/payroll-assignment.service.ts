import { randomUUID } from "node:crypto";

import { sql } from "@/lib/db";

export interface EmployeePayrollAssignmentRecord {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  employeeLocationId?: string | null;
  employeeLocationName?: string | null;
  payrollComponentId: string;
  payrollComponentCode: string;
  payrollComponentName: string;
  payrollComponentType: string;
  taxable: boolean;
  amount?: number | null;
  ratePercent?: number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  remarks?: string | null;
  isActive: boolean;
}

export interface EmployeePayrollAssignmentListScope {
  accessibleLocationIds?: string[] | null;
  employeeId?: string | null;
}

export interface EmployeePayrollAssignmentPayload {
  employeeId: string;
  payrollComponentId: string;
  amount?: number | null;
  ratePercent?: number | null;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
  remarks?: string | null;
  isActive?: boolean;
}

export interface EmployeePayrollAssignmentSummary {
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  totalAssignments: number;
  activeAssignments: number;
  activeAllowanceAmount: number;
  activeDeductionAmount: number;
}

export interface EmployeePayrollAssignmentConflict {
  id: string;
  payrollComponentCode: string;
  payrollComponentName: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
}

function normalizeNullableString(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeEffectiveDate(value: string | null | undefined) {
  return normalizeNullableString(value)?.slice(0, 10) ?? null;
}

function rangesOverlap(
  leftFrom: string | null,
  leftTo: string | null,
  rightFrom: string | null,
  rightTo: string | null,
) {
  const startLeft = new Date(leftFrom ?? "1900-01-01");
  const endLeft = new Date(leftTo ?? "2999-12-31");
  const startRight = new Date(rightFrom ?? "1900-01-01");
  const endRight = new Date(rightTo ?? "2999-12-31");
  return startLeft <= endRight && startRight <= endLeft;
}

async function validateAssignmentReferences(
  payload: EmployeePayrollAssignmentPayload,
  scope?: { accessibleLocationIds?: string[] | null },
) {
  const [employeeRows, componentRows] = await Promise.all([
    sql<Array<{ id: string; locationId: string | null }>>`
      SELECT id, "locationId"
      FROM "Employee"
      WHERE id = ${payload.employeeId}
        AND "isArchived" = false
        AND "isActive" = true
      LIMIT 1
    `,
    sql<Array<{ id: string }>>`
      SELECT id
      FROM "PayrollComponent"
      WHERE id = ${payload.payrollComponentId}
        AND "isArchived" = false
        AND "isActive" = true
      LIMIT 1
    `,
  ]);

  const employee = employeeRows[0];
  if (!employee) {
    throw new Error("Selected employee was not found.");
  }
  if (!componentRows[0]) {
    throw new Error("Selected payroll component was not found.");
  }

  const accessibleLocationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  if (scope?.accessibleLocationIds && accessibleLocationIds.length > 0 && employee.locationId && !accessibleLocationIds.includes(employee.locationId)) {
    throw new Error("You do not have access to the selected employee location.");
  }
}

export async function listEmployeePayrollAssignments(scope?: EmployeePayrollAssignmentListScope) {
  const accessibleLocationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  const locationScope = accessibleLocationIds.length ? sql`AND e."locationId" IN ${sql(accessibleLocationIds)}` : sql``;
  const employeeScope = normalizeNullableString(scope?.employeeId) ? sql`AND epa."employeeId" = ${normalizeNullableString(scope?.employeeId)}` : sql``;

  return sql<Array<EmployeePayrollAssignmentRecord>>`
    SELECT
      epa.id,
      epa."employeeId",
      e."employeeNo",
      CONCAT_WS(' ', e."firstName", e."middleName", e."lastName") AS "employeeName",
      e."locationId" AS "employeeLocationId",
      l."locationName" AS "employeeLocationName",
      epa."payrollComponentId",
      pc.code AS "payrollComponentCode",
      pc.name AS "payrollComponentName",
      pc.type::text AS "payrollComponentType",
      pc.taxable,
      epa.amount,
      epa."ratePercent",
      epa."effectiveFrom"::date::text AS "effectiveFrom",
      epa."effectiveTo"::date::text AS "effectiveTo",
      epa.remarks,
      epa."isActive"
    FROM "EmployeePayrollAssignment" epa
    INNER JOIN "Employee" e ON e.id = epa."employeeId"
    INNER JOIN "PayrollComponent" pc ON pc.id = epa."payrollComponentId"
    LEFT JOIN "Location" l ON l.id = e."locationId"
    WHERE epa."isArchived" = false
    ${locationScope}
    ${employeeScope}
    ORDER BY e."employeeNo" ASC, pc.code ASC, epa."effectiveFrom" DESC NULLS LAST
  `;
}

export async function getEmployeePayrollAssignmentSummary(
  employeeId: string,
  scope?: { accessibleLocationIds?: string[] | null },
) {
  const employeeKey = normalizeNullableString(employeeId);
  if (!employeeKey) {
    return null;
  }

  const accessibleLocationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  const locationScope = accessibleLocationIds.length ? sql`AND e."locationId" IN ${sql(accessibleLocationIds)}` : sql``;

  const rows = await sql<Array<EmployeePayrollAssignmentSummary>>`
    SELECT
      e.id AS "employeeId",
      e."employeeNo",
      CONCAT_WS(' ', e."firstName", e."middleName", e."lastName") AS "employeeName",
      COUNT(epa.id)::int AS "totalAssignments",
      COUNT(epa.id) FILTER (WHERE epa."isActive" = true)::int AS "activeAssignments",
      COALESCE(SUM(epa.amount) FILTER (WHERE epa."isActive" = true AND pc.type::text = 'ALLOWANCE'), 0)::float AS "activeAllowanceAmount",
      COALESCE(SUM(epa.amount) FILTER (WHERE epa."isActive" = true AND pc.type::text = 'DEDUCTION'), 0)::float AS "activeDeductionAmount"
    FROM "Employee" e
    LEFT JOIN "EmployeePayrollAssignment" epa ON epa."employeeId" = e.id AND epa."isArchived" = false
    LEFT JOIN "PayrollComponent" pc ON pc.id = epa."payrollComponentId"
    WHERE e.id = ${employeeKey}
      AND e."isArchived" = false
    ${locationScope}
    GROUP BY e.id, e."employeeNo", e."firstName", e."middleName", e."lastName"
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function findAssignmentConflicts(
  payload: EmployeePayrollAssignmentPayload,
  excludeId?: string | null,
) {
  const employeeId = normalizeNullableString(payload.employeeId);
  const payrollComponentId = normalizeNullableString(payload.payrollComponentId);
  const excludedId = normalizeNullableString(excludeId);
  if (!employeeId || !payrollComponentId) {
    return [] as EmployeePayrollAssignmentConflict[];
  }

  const candidateRows = await sql<Array<EmployeePayrollAssignmentConflict>>`
    SELECT
      epa.id,
      pc.code AS "payrollComponentCode",
      pc.name AS "payrollComponentName",
      epa."effectiveFrom"::date::text AS "effectiveFrom",
      epa."effectiveTo"::date::text AS "effectiveTo"
    FROM "EmployeePayrollAssignment" epa
    INNER JOIN "PayrollComponent" pc ON pc.id = epa."payrollComponentId"
    WHERE epa."employeeId" = ${employeeId}
      AND epa."payrollComponentId" = ${payrollComponentId}
      AND epa."isArchived" = false
      AND epa."isActive" = true
      ${excludedId ? sql`AND epa.id <> ${excludedId}` : sql``}
  `;

  const effectiveFrom = normalizeEffectiveDate(payload.effectiveFrom);
  const effectiveTo = normalizeEffectiveDate(payload.effectiveTo);

  return candidateRows.filter((row) =>
    rangesOverlap(
      effectiveFrom,
      effectiveTo,
      normalizeEffectiveDate(row.effectiveFrom),
      normalizeEffectiveDate(row.effectiveTo),
    ),
  );
}

export async function getPayrollAssignmentReferenceData(scope?: { accessibleLocationIds?: string[] | null }) {
  const accessibleLocationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  const employeeScope = accessibleLocationIds.length ? sql`AND "locationId" IN ${sql(accessibleLocationIds)}` : sql``;

  const [employees, payrollComponents] = await Promise.all([
    sql<Array<{ value: string; label: string }>>`
      SELECT id AS value, CONCAT("employeeNo", ' - ', "firstName", ' ', "lastName") AS label
      FROM "Employee"
      WHERE "isArchived" = false
        AND "isActive" = true
      ${employeeScope}
      ORDER BY "employeeNo" ASC
    `,
    sql<Array<{ value: string; label: string }>>`
      SELECT id AS value, CONCAT(code, ' - ', name, ' (', type::text, ')') AS label
      FROM "PayrollComponent"
      WHERE "isArchived" = false
        AND "isActive" = true
      ORDER BY code ASC
    `,
  ]);

  return { employees, payrollComponents };
}

export async function createEmployeePayrollAssignment(
  payload: EmployeePayrollAssignmentPayload,
  scope?: { accessibleLocationIds?: string[] | null },
) {
  await validateAssignmentReferences(payload, scope);

  if (payload.effectiveFrom && payload.effectiveTo && new Date(payload.effectiveTo) < new Date(payload.effectiveFrom)) {
    throw new Error("Effective to date cannot be before effective from date.");
  }

  if (payload.isActive !== false) {
    const conflicts = await findAssignmentConflicts(payload);
    if (conflicts.length) {
      throw new Error(`Active assignment date range overlaps with existing ${conflicts[0].payrollComponentCode} assignment history for this employee.`);
    }
  }

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO "EmployeePayrollAssignment" (
      id,
      "employeeId",
      "payrollComponentId",
      amount,
      "ratePercent",
      "effectiveFrom",
      "effectiveTo",
      remarks,
      "isActive",
      "isArchived",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${payload.employeeId},
      ${payload.payrollComponentId},
      ${payload.amount == null ? null : Number(payload.amount)},
      ${payload.ratePercent == null ? null : Number(payload.ratePercent)},
      ${payload.effectiveFrom ? new Date(payload.effectiveFrom) : null},
      ${payload.effectiveTo ? new Date(payload.effectiveTo) : null},
      ${normalizeNullableString(payload.remarks)},
      ${payload.isActive !== false},
      false,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0]?.id ?? null;
}

export async function updateEmployeePayrollAssignment(
  id: string,
  payload: EmployeePayrollAssignmentPayload,
  scope?: { accessibleLocationIds?: string[] | null },
) {
  await validateAssignmentReferences(payload, scope);

  if (payload.effectiveFrom && payload.effectiveTo && new Date(payload.effectiveTo) < new Date(payload.effectiveFrom)) {
    throw new Error("Effective to date cannot be before effective from date.");
  }

  if (payload.isActive !== false) {
    const conflicts = await findAssignmentConflicts(payload, id);
    if (conflicts.length) {
      throw new Error(`Active assignment date range overlaps with existing ${conflicts[0].payrollComponentCode} assignment history for this employee.`);
    }
  }

  await sql`
    UPDATE "EmployeePayrollAssignment"
    SET
      "employeeId" = ${payload.employeeId},
      "payrollComponentId" = ${payload.payrollComponentId},
      amount = ${payload.amount == null ? null : Number(payload.amount)},
      "ratePercent" = ${payload.ratePercent == null ? null : Number(payload.ratePercent)},
      "effectiveFrom" = ${payload.effectiveFrom ? new Date(payload.effectiveFrom) : null},
      "effectiveTo" = ${payload.effectiveTo ? new Date(payload.effectiveTo) : null},
      remarks = ${normalizeNullableString(payload.remarks)},
      "isActive" = ${payload.isActive !== false},
      "updatedAt" = NOW()
    WHERE id = ${id}
      AND "isArchived" = false
  `;

  return id;
}

export async function archiveEmployeePayrollAssignment(id: string, scope?: { accessibleLocationIds?: string[] | null }) {
  const rows = await sql<Array<{ locationId: string | null }>>`
    SELECT e."locationId"
    FROM "EmployeePayrollAssignment" epa
    INNER JOIN "Employee" e ON e.id = epa."employeeId"
    WHERE epa.id = ${id}
      AND epa."isArchived" = false
    LIMIT 1
  `;

  const record = rows[0];
  if (!record) {
    throw new Error("Payroll assignment was not found.");
  }

  const accessibleLocationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  if (scope?.accessibleLocationIds && accessibleLocationIds.length > 0 && record.locationId && !accessibleLocationIds.includes(record.locationId)) {
    throw new Error("You do not have access to this payroll assignment.");
  }

  await sql`
    UPDATE "EmployeePayrollAssignment"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE id = ${id}
  `;
}

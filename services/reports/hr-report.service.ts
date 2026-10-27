import { sql } from "@/lib/db";
import { getPayrollSettings, resolvePayrollDayType } from "@/services/hr/payroll.service";
import type { CommonReportFilters } from "@/services/reports/report-filter.service";

type HrScope = {
  accessibleLocationIds?: string[] | null;
};

export interface HrReportFilters extends CommonReportFilters {
  employeeId?: string | null;
  leaveTypeId?: string | null;
  sourceType?: string | null;
}

function buildLocationScope(scope: HrScope, locationExpression: ReturnType<typeof sql>) {
  const locationIds = scope.accessibleLocationIds?.filter(Boolean) ?? [];
  if (!locationIds.length) {
    return sql``;
  }

  return sql`AND ${locationExpression} IN ${sql(locationIds)}`;
}

export interface HrAttendanceReportRow {
  attendanceId: string;
  attendanceDate: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  shiftCode: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  userId: string | null;
  userName: string | null;
  sourceType: string;
  status: string;
  approvalStatus: string;
  approvedByName: string | null;
  hoursWorked: number;
  overtimeHours: number;
  remarks: string | null;
}

export interface HrLeaveReportRow {
  leaveId: string;
  leaveNo: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  leaveTypeName: string;
  locationId: string | null;
  locationName: string | null;
  startDate: string;
  endDate: string;
  days: number;
  paid: boolean;
  status: string;
  requestedByName: string | null;
  finalApprovedByName: string | null;
  createdAt: string;
  remarks: string | null;
}

export interface HrOvertimeReportRow {
  overtimeId: string;
  overtimeNo: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  locationId: string | null;
  locationName: string | null;
  overtimeDate: string;
  shiftCode: string | null;
  hours: number;
  dayType: string;
  rateMultiplier: number;
  amount: number;
  status: string;
  approvedByName: string | null;
  reason: string | null;
}

export interface HrPayrollReportRow {
  payrollRunId: string;
  payrollNo: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  status: string;
  employeeCount: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  createdByName: string | null;
  approvedByName: string | null;
  postedByName: string | null;
}

export interface HrReportReferenceData {
  employees: Array<{ value: string; label: string }>;
  locations: Array<{ value: string; label: string }>;
  leaveTypes: Array<{ value: string; label: string }>;
}

function normalizeNullableString(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function buildDateFilters(filters: HrReportFilters, column: ReturnType<typeof sql>) {
  const dateFrom = normalizeNullableString(filters.dateFrom);
  const dateTo = normalizeNullableString(filters.dateTo);
  return sql`
    ${dateFrom ? sql`AND ${column} >= ${new Date(dateFrom)}` : sql``}
    ${dateTo ? sql`AND ${column} <= ${new Date(dateTo)}` : sql``}
  `;
}

export async function getHrReportReferenceData(scope: HrScope = {}): Promise<HrReportReferenceData> {
  const locationIds = scope.accessibleLocationIds?.filter(Boolean) ?? [];
  const locationScope = locationIds.length ? sql`AND id IN ${sql(locationIds)}` : sql``;
  const employeeScope = locationIds.length ? sql`AND "locationId" IN ${sql(locationIds)}` : sql``;

  const [employees, locations, leaveTypes] = await Promise.all([
    sql<Array<{ value: string; label: string }>>`
      SELECT
        id AS value,
        CONCAT("employeeNo", ' - ', "firstName", ' ', "lastName") AS label
      FROM "Employee"
      WHERE "isArchived" = false
        AND "isActive" = true
      ${employeeScope}
      ORDER BY "employeeNo" ASC
    `,
    sql<Array<{ value: string; label: string }>>`
      SELECT id AS value, CONCAT("locationCode", ' - ', "locationName") AS label
      FROM "Location"
      WHERE "isArchived" = false
        AND "isActive" = true
      ${locationScope}
      ORDER BY "locationName" ASC
    `,
    sql<Array<{ value: string; label: string }>>`
      SELECT id AS value, CONCAT(code, ' - ', name) AS label
      FROM "LeaveType"
      WHERE "isArchived" = false
        AND "isActive" = true
      ORDER BY name ASC
    `,
  ]);

  return { employees, locations, leaveTypes };
}

export async function getHrAttendanceReport(
  scope: HrScope = {},
  filters: HrReportFilters = {},
): Promise<HrAttendanceReportRow[]> {
  try {
    return await sql<Array<HrAttendanceReportRow>>`
      SELECT
        da.id AS "attendanceId",
        da."attendanceDate"::text AS "attendanceDate",
        e.id AS "employeeId",
        e."employeeNo",
        CONCAT_WS(' ', e."firstName", e."middleName", e."lastName") AS "employeeName",
        COALESCE(da."shiftCode", '-') AS "shiftCode",
        l.id AS "locationId",
        l."locationCode",
        l."locationName",
        u.id AS "userId",
        u.name AS "userName",
        da."sourceType"::text AS "sourceType",
        da.status::text AS status,
        da."approvalStatus"::text AS "approvalStatus",
        approver.name AS "approvedByName",
        da."hoursWorked",
        da."overtimeHours",
        da.remarks
      FROM "DailyAttendance" da
      INNER JOIN "Employee" e ON e.id = da."employeeId"
      LEFT JOIN "Location" l ON l.id = COALESCE(da."locationId", e."locationId")
      LEFT JOIN "User" u ON u.id = da."userId"
      LEFT JOIN "User" approver ON approver.id = da."approvedById"
      WHERE da."isArchived" = false
      ${buildLocationScope(scope, sql`COALESCE(da."locationId", e."locationId")`)}
      ${buildDateFilters(filters, sql`da."attendanceDate"`)}
      ${filters.employeeId ? sql`AND da."employeeId" = ${filters.employeeId}` : sql``}
      ${filters.status ? sql`AND da.status::text = ${filters.status}` : sql``}
      ${filters.sourceType ? sql`AND da."sourceType"::text = ${filters.sourceType}` : sql``}
      ORDER BY da."attendanceDate" DESC, e."employeeNo" ASC
    `;
  } catch {
    return [];
  }
}

export async function getHrLeaveReport(
  scope: HrScope = {},
  filters: HrReportFilters = {},
): Promise<HrLeaveReportRow[]> {
  try {
    return await sql<Array<HrLeaveReportRow>>`
      SELECT
        lr.id AS "leaveId",
        lr."leaveNo",
        e.id AS "employeeId",
        e."employeeNo",
        CONCAT_WS(' ', e."firstName", e."middleName", e."lastName") AS "employeeName",
        lt.name AS "leaveTypeName",
        lr."locationId",
        l."locationName",
        lr."startDate"::text AS "startDate",
        lr."endDate"::text AS "endDate",
        lr.days,
        lt.paid,
        lr.status::text AS status,
        ru.name AS "requestedByName",
        fu.name AS "finalApprovedByName",
        lr."createdAt"::text AS "createdAt",
        lr.remarks
      FROM "LeaveRequest" lr
      INNER JOIN "Employee" e ON e.id = lr."employeeId"
      INNER JOIN "LeaveType" lt ON lt.id = lr."leaveTypeId"
      LEFT JOIN "Location" l ON l.id = lr."locationId"
      LEFT JOIN "User" ru ON ru.id = lr."requestedById"
      LEFT JOIN "User" fu ON fu.id = lr."finalApprovedById"
      WHERE lr."isArchived" = false
      ${buildLocationScope(scope, sql`lr."locationId"`)}
      ${buildDateFilters(filters, sql`lr."startDate"`)}
      ${filters.employeeId ? sql`AND lr."employeeId" = ${filters.employeeId}` : sql``}
      ${filters.leaveTypeId ? sql`AND lr."leaveTypeId" = ${filters.leaveTypeId}` : sql``}
      ${filters.status ? sql`AND lr.status::text = ${filters.status}` : sql``}
      ORDER BY lr."startDate" DESC, lr."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

export async function getHrOvertimeReport(
  scope: HrScope = {},
  filters: HrReportFilters = {},
): Promise<HrOvertimeReportRow[]> {
  try {
    const settings = await getPayrollSettings();
    const rows = await sql<Array<Omit<HrOvertimeReportRow, "dayType"> & { overtimeDate: string }>>`
      SELECT
        ot.id AS "overtimeId",
        ot."overtimeNo",
        e.id AS "employeeId",
        e."employeeNo",
        CONCAT_WS(' ', e."firstName", e."middleName", e."lastName") AS "employeeName",
        ot."locationId",
        l."locationName",
        ot."overtimeDate"::text AS "overtimeDate",
        ot."shiftCode",
        ot.hours,
        ot."rateMultiplier",
        ot.amount,
        ot.status::text AS status,
        au.name AS "approvedByName",
        ot.reason
      FROM "OvertimeRequest" ot
      INNER JOIN "Employee" e ON e.id = ot."employeeId"
      LEFT JOIN "Location" l ON l.id = ot."locationId"
      LEFT JOIN "User" au ON au.id = ot."approvedById"
      WHERE ot."isArchived" = false
      ${buildLocationScope(scope, sql`ot."locationId"`)}
      ${buildDateFilters(filters, sql`ot."overtimeDate"`)}
      ${filters.employeeId ? sql`AND ot."employeeId" = ${filters.employeeId}` : sql``}
      ${filters.status ? sql`AND ot.status::text = ${filters.status}` : sql``}
      ORDER BY ot."overtimeDate" DESC, ot."createdAt" DESC
    `;

    return rows.map((row) => ({
      ...row,
      dayType: resolvePayrollDayType(row.overtimeDate, settings),
    }));
  } catch {
    return [];
  }
}

export async function getHrPayrollReport(
  scope: HrScope = {},
  filters: HrReportFilters = {},
): Promise<HrPayrollReportRow[]> {
  try {
    return await sql<Array<HrPayrollReportRow>>`
      SELECT
        pr.id AS "payrollRunId",
        pr."payrollNo",
        pr."periodStart"::text AS "periodStart",
        pr."periodEnd"::text AS "periodEnd",
        pr."paymentDate"::text AS "paymentDate",
        pr.status::text AS status,
        COUNT(pe.id)::int AS "employeeCount",
        pr."grossPay",
        pr."totalDeductions",
        pr."netPay",
        cu.name AS "createdByName",
        au.name AS "approvedByName",
        pu.name AS "postedByName"
      FROM "PayrollRun" pr
      LEFT JOIN "PayrollEmployee" pe ON pe."payrollRunId" = pr.id
      LEFT JOIN "Employee" e ON e.id = pe."employeeId"
      LEFT JOIN "User" cu ON cu.id = pr."createdById"
      LEFT JOIN "User" au ON au.id = pr."approvedById"
      LEFT JOIN "User" pu ON pu.id = pr."postedById"
      WHERE pr."isArchived" = false
      ${buildDateFilters(filters, sql`pr."paymentDate"`)}
      ${filters.status ? sql`AND pr.status::text = ${filters.status}` : sql``}
      ${
        scope.accessibleLocationIds?.filter(Boolean)?.length
          ? sql`AND EXISTS (
              SELECT 1
              FROM "PayrollEmployee" pe2
              INNER JOIN "Employee" e2 ON e2.id = pe2."employeeId"
              WHERE pe2."payrollRunId" = pr.id
                AND e2."locationId" IN ${sql(scope.accessibleLocationIds.filter(Boolean))}
            )`
          : sql``
      }
      ${
        filters.locationId
          ? sql`AND EXISTS (
              SELECT 1
              FROM "PayrollEmployee" pe3
              INNER JOIN "Employee" e3 ON e3.id = pe3."employeeId"
              WHERE pe3."payrollRunId" = pr.id
                AND e3."locationId" = ${filters.locationId}
            )`
          : sql``
      }
      GROUP BY pr.id, cu.name, au.name, pu.name
      ORDER BY pr."periodStart" DESC, pr."createdAt" DESC
    `;
  } catch {
    return [];
  }
}

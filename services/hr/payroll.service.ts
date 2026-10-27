import { randomUUID } from "node:crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { syncPayrollJournalEntry, syncPayrollPaymentJournal } from "@/services/accounting/accounting.service";
import { listAccounts } from "@/services/accounting/accounting.service";

export interface PayrollSettingsRecord {
  taxPercent: number;
  employeePensionPercent: number;
  employerPensionPercent: number;
  overtimeMultiplier: number;
  normalDayOvertimeMultiplier: number;
  weekendOvertimeMultiplier: number;
  holidayOvertimeMultiplier: number;
  standardWorkDaysPerMonth: number;
  attendanceRequiredForSalary: boolean;
  weekendDays: number[];
  holidayDates: string[];
  salaryExpenseAccountId?: string | null;
  employerPensionExpenseAccountId?: string | null;
  salaryPayableAccountId?: string | null;
  taxPayableAccountId?: string | null;
  pensionPayableAccountId?: string | null;
}

export interface PayrollRunSummary {
  id: string;
  publicId: number;
  payrollNo: string;
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  status: string;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  employeeCount: number;
  createdByName?: string | null;
  approvedByName?: string | null;
  postedByName?: string | null;
  createdAt: string;
  updatedAt: string;
  paymentJournalId?: string | null;
  paymentJournalNo?: string | null;
  paidAt?: string | null;
}

export interface PayrollEmployeeLine {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  locationId?: string | null;
  locationName?: string | null;
  departmentName?: string | null;
  baseSalary: number;
  overtimeAmount: number;
  allowanceAmount: number;
  bonusAmount: number;
  taxableIncome: number;
  incomeTax: number;
  pensionEmployee: number;
  pensionEmployer: number;
  loanDeduction: number;
  otherDeduction: number;
  grossPay: number;
  totalDeductions: number;
  netPay: number;
  remarks?: string | null;
}

export interface PayrollRunDetail extends PayrollRunSummary {
  remarks?: string | null;
  employees: PayrollEmployeeLine[];
}

export interface PayrollRunPayload {
  periodStart: string;
  periodEnd: string;
  paymentDate: string;
  locationId?: string | null;
  remarks?: string | null;
}

function normalizeNullableString(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function toNumber(value: string | null | undefined, fallback: number) {
  const numeric = Number(value ?? "");
  return Number.isFinite(numeric) ? numeric : fallback;
}

function toBoolean(value: string | null | undefined, fallback: boolean) {
  if (value == null || value === "") {
    return fallback;
  }
  return value === "true" || value === "1";
}

function parseNumberArray(value: string | null | undefined, fallback: number[]) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) {
      return fallback;
    }
    return parsed
      .map((entry) => Number(entry))
      .filter((entry) => Number.isInteger(entry) && entry >= 0 && entry <= 6);
  } catch {
    return fallback;
  }
}

function parseStringArray(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) {
      return [] as string[];
    }
    return parsed.map((entry) => String(entry).trim()).filter(Boolean);
  } catch {
    return [] as string[];
  }
}

export function normalizeDateKey(date: Date | string) {
  const value = typeof date === "string" ? new Date(date) : date;
  return value.toISOString().slice(0, 10);
}

export function resolvePayrollDayType(date: Date | string, settings: PayrollSettingsRecord) {
  const value = typeof date === "string" ? new Date(date) : date;
  const dateKey = normalizeDateKey(value);
  if (settings.holidayDates.includes(dateKey)) {
    return "HOLIDAY";
  }
  if (settings.weekendDays.includes(value.getUTCDay())) {
    return "WEEKEND";
  }
  return "NORMAL";
}

export function resolveOvertimeMultiplier(date: Date | string, settings: PayrollSettingsRecord) {
  const dayType = resolvePayrollDayType(date, settings);
  if (dayType === "HOLIDAY") {
    return settings.holidayOvertimeMultiplier;
  }
  if (dayType === "WEEKEND") {
    return settings.weekendOvertimeMultiplier;
  }
  return settings.normalDayOvertimeMultiplier || settings.overtimeMultiplier;
}

function enumerateDateKeys(startDate: Date, endDate: Date) {
  const dates: string[] = [];
  const current = new Date(Date.UTC(startDate.getUTCFullYear(), startDate.getUTCMonth(), startDate.getUTCDate()));
  const end = new Date(Date.UTC(endDate.getUTCFullYear(), endDate.getUTCMonth(), endDate.getUTCDate()));
  while (current <= end) {
    dates.push(normalizeDateKey(current));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

async function getPayrollSettingMap() {
  const rows = await sql<Array<{ key: string; value: string }>>`
    SELECT key, value
    FROM "ModuleSetting"
    WHERE module = 'hr'
      AND "isArchived" = false
      AND key LIKE 'payroll.%'
  `;

  return new Map(rows.map((row) => [row.key, row.value]));
}

export async function getPayrollSettings() {
  const settingsMap = await getPayrollSettingMap();

  return {
    taxPercent: toNumber(settingsMap.get("payroll.taxPercent"), 30),
    employeePensionPercent: toNumber(settingsMap.get("payroll.employeePensionPercent"), 7),
    employerPensionPercent: toNumber(settingsMap.get("payroll.employerPensionPercent"), 11),
    overtimeMultiplier: toNumber(settingsMap.get("payroll.overtimeMultiplier"), 1.5),
    normalDayOvertimeMultiplier: toNumber(settingsMap.get("payroll.normalDayOvertimeMultiplier"), toNumber(settingsMap.get("payroll.overtimeMultiplier"), 1.5)),
    weekendOvertimeMultiplier: toNumber(settingsMap.get("payroll.weekendOvertimeMultiplier"), 2),
    holidayOvertimeMultiplier: toNumber(settingsMap.get("payroll.holidayOvertimeMultiplier"), 2.5),
    standardWorkDaysPerMonth: toNumber(settingsMap.get("payroll.standardWorkDaysPerMonth"), 26),
    attendanceRequiredForSalary: toBoolean(settingsMap.get("payroll.attendanceRequiredForSalary"), true),
    weekendDays: parseNumberArray(settingsMap.get("payroll.weekendDays"), [0]),
    holidayDates: parseStringArray(settingsMap.get("payroll.holidayDates")),
    salaryExpenseAccountId: normalizeNullableString(settingsMap.get("payroll.salaryExpenseAccountId")),
    employerPensionExpenseAccountId: normalizeNullableString(settingsMap.get("payroll.employerPensionExpenseAccountId")),
    salaryPayableAccountId: normalizeNullableString(settingsMap.get("payroll.salaryPayableAccountId")),
    taxPayableAccountId: normalizeNullableString(settingsMap.get("payroll.taxPayableAccountId")),
    pensionPayableAccountId: normalizeNullableString(settingsMap.get("payroll.pensionPayableAccountId")),
  } satisfies PayrollSettingsRecord;
}

export async function getPayrollSettingsReferenceData() {
  const [settings, accounts] = await Promise.all([getPayrollSettings(), listAccounts()]);
  return { settings, accounts };
}

export async function updatePayrollSettings(input: PayrollSettingsRecord) {
  const settings = [
    { key: "payroll.taxPercent", value: String(Number(input.taxPercent ?? 0)) },
    { key: "payroll.employeePensionPercent", value: String(Number(input.employeePensionPercent ?? 0)) },
    { key: "payroll.employerPensionPercent", value: String(Number(input.employerPensionPercent ?? 0)) },
    { key: "payroll.overtimeMultiplier", value: String(Number(input.overtimeMultiplier ?? 0)) },
    { key: "payroll.normalDayOvertimeMultiplier", value: String(Number(input.normalDayOvertimeMultiplier ?? 0)) },
    { key: "payroll.weekendOvertimeMultiplier", value: String(Number(input.weekendOvertimeMultiplier ?? 0)) },
    { key: "payroll.holidayOvertimeMultiplier", value: String(Number(input.holidayOvertimeMultiplier ?? 0)) },
    { key: "payroll.standardWorkDaysPerMonth", value: String(Number(input.standardWorkDaysPerMonth ?? 0)) },
    { key: "payroll.attendanceRequiredForSalary", value: input.attendanceRequiredForSalary ? "true" : "false" },
    { key: "payroll.weekendDays", value: JSON.stringify(input.weekendDays ?? []) },
    { key: "payroll.holidayDates", value: JSON.stringify((input.holidayDates ?? []).map((entry) => String(entry).slice(0, 10))) },
    { key: "payroll.salaryExpenseAccountId", value: normalizeNullableString(input.salaryExpenseAccountId) ?? "" },
    { key: "payroll.employerPensionExpenseAccountId", value: normalizeNullableString(input.employerPensionExpenseAccountId) ?? "" },
    { key: "payroll.salaryPayableAccountId", value: normalizeNullableString(input.salaryPayableAccountId) ?? "" },
    { key: "payroll.taxPayableAccountId", value: normalizeNullableString(input.taxPayableAccountId) ?? "" },
    { key: "payroll.pensionPayableAccountId", value: normalizeNullableString(input.pensionPayableAccountId) ?? "" },
  ];

  await sql.begin(async (tx) => {
    for (const setting of settings) {
      await tx`
        INSERT INTO "ModuleSetting" ("id", "module", "key", "value", "isArchived", "createdAt", "updatedAt")
        VALUES (${randomUUID()}, 'hr', ${setting.key}, ${setting.value}, false, NOW(), NOW())
        ON CONFLICT ("module", "key") DO UPDATE SET
          "value" = EXCLUDED."value",
          "isArchived" = false,
          "updatedAt" = NOW()
      `;
    }
  });
}

export async function getNextPayrollNumber() {
  const rows = await sql<Array<{ payrollNo: string }>>`
    SELECT "payrollNo"
    FROM "PayrollRun"
    WHERE "payrollNo" LIKE 'PAY-%'
    ORDER BY "createdAt" DESC
    LIMIT 250
  `;

  let max = 0;
  for (const row of rows) {
    const match = row.payrollNo.match(/PAY-(\d+)/i);
    if (!match) continue;
    max = Math.max(max, Number(match[1]));
  }

  return `PAY-${String(max + 1).padStart(4, "0")}`;
}

export async function getPayrollRunReferenceData(scope?: { accessibleLocationIds?: string[] | null }) {
  const locationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  const locationScope = locationIds.length ? sql`AND id IN ${sql(locationIds)}` : sql``;

  const [nextPayrollNo, locations, settings] = await Promise.all([
    getNextPayrollNumber(),
    sql<Array<{ value: string; label: string }>>`
      SELECT id AS value, CONCAT("locationCode", ' - ', "locationName") AS label
      FROM "Location"
      WHERE "isArchived" = false
        AND "isActive" = true
      ${locationScope}
      ORDER BY "locationName" ASC
    `,
    getPayrollSettings(),
  ]);

  return { nextPayrollNo, locations, settings };
}

function mapPayrollRun(row: Record<string, unknown>): PayrollRunSummary {
  return {
    id: String(row.id),
    publicId: Number(row.publicId ?? 0),
    payrollNo: String(row.payrollNo),
    periodStart: String(row.periodStart),
    periodEnd: String(row.periodEnd),
    paymentDate: String(row.paymentDate),
    status: String(row.status ?? "DRAFT"),
    grossPay: Number(row.grossPay ?? 0),
    totalDeductions: Number(row.totalDeductions ?? 0),
    netPay: Number(row.netPay ?? 0),
    employeeCount: Number(row.employeeCount ?? 0),
    createdByName: row.createdByName ? String(row.createdByName) : null,
    approvedByName: row.approvedByName ? String(row.approvedByName) : null,
    postedByName: row.postedByName ? String(row.postedByName) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
    paymentJournalId: row.paymentJournalId ? String(row.paymentJournalId) : null,
    paymentJournalNo: row.paymentJournalNo ? String(row.paymentJournalNo) : null,
    paidAt: row.paidAt ? String(row.paidAt) : null,
  };
}

export async function listPayrollRuns(scope?: { accessibleLocationIds?: string[] | null }) {
  const locationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  const locationScope = locationIds.length
    ? sql`AND EXISTS (
        SELECT 1
        FROM "PayrollEmployee" pe
        INNER JOIN "Employee" e ON e.id = pe."employeeId"
        WHERE pe."payrollRunId" = pr.id
          AND e."locationId" IN ${sql(locationIds)}
      )`
    : sql``;

  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT
      pr.id,
      pr."publicId",
      pr."payrollNo",
      pr."periodStart"::text AS "periodStart",
      pr."periodEnd"::text AS "periodEnd",
      pr."paymentDate"::text AS "paymentDate",
      pr.status::text AS status,
      pr."grossPay",
      pr."totalDeductions",
      pr."netPay",
      COUNT(pe.id)::int AS "employeeCount",
      cu.name AS "createdByName",
      au.name AS "approvedByName",
      pu.name AS "postedByName",
      pr."createdAt"::text AS "createdAt",
      pr."updatedAt"::text AS "updatedAt"
    FROM "PayrollRun" pr
    LEFT JOIN "PayrollEmployee" pe ON pe."payrollRunId" = pr.id
    LEFT JOIN "User" cu ON cu.id = pr."createdById"
    LEFT JOIN "User" au ON au.id = pr."approvedById"
    LEFT JOIN "User" pu ON pu.id = pr."postedById"
    WHERE pr."isArchived" = false
    ${locationScope}
    GROUP BY pr.id, cu.name, au.name, pu.name
    ORDER BY pr."periodStart" DESC, pr."createdAt" DESC
  `;

  return rows.map(mapPayrollRun);
}

export async function getPayrollRunById(key: string, scope?: { accessibleLocationIds?: string[] | null }) {
  const headerRows = await sql<Array<Record<string, unknown>>>`
    SELECT
      pr.id,
      pr."publicId",
      pr."payrollNo",
      pr."periodStart"::text AS "periodStart",
      pr."periodEnd"::text AS "periodEnd",
      pr."paymentDate"::text AS "paymentDate",
      pr.status::text AS status,
      pr."grossPay",
      pr."totalDeductions",
      pr."netPay",
      pr.remarks,
      COUNT(pe.id)::int AS "employeeCount",
      cu.name AS "createdByName",
      au.name AS "approvedByName",
      pu.name AS "postedByName",
      pr."createdAt"::text AS "createdAt",
      pr."updatedAt"::text AS "updatedAt"
      , payment_journal.id AS "paymentJournalId"
      , payment_journal."journalNo" AS "paymentJournalNo"
      , payment_journal."postedAt"::text AS "paidAt"
    FROM "PayrollRun" pr
    LEFT JOIN "PayrollEmployee" pe ON pe."payrollRunId" = pr.id
    LEFT JOIN "User" cu ON cu.id = pr."createdById"
    LEFT JOIN "User" au ON au.id = pr."approvedById"
    LEFT JOIN "User" pu ON pu.id = pr."postedById"
    LEFT JOIN "JournalEntry" payment_journal ON payment_journal."sourceType" = 'hr.payroll.payment' AND payment_journal."sourceId" = pr.id AND payment_journal.status = 'POSTED'
    WHERE ${isPublicIdParam(key) ? sql`pr."publicId" = ${Number(key)}` : sql`pr.id = ${key}`}
      AND pr."isArchived" = false
    GROUP BY pr.id, cu.name, au.name, pu.name, payment_journal.id
    LIMIT 1
  `;

  if (!headerRows[0]) {
    return null;
  }

  const employeeRows = await sql<Array<Record<string, unknown>>>`
    SELECT
      pe.id,
      pe."employeeId",
      e."employeeNo",
      CONCAT_WS(' ', e."firstName", e."middleName", e."lastName") AS "employeeName",
      e."locationId",
      l."locationName",
      d.name AS "departmentName",
      pe."baseSalary",
      pe."overtimeAmount",
      pe."allowanceAmount",
      pe."bonusAmount",
      pe."taxableIncome",
      pe."incomeTax",
      pe."pensionEmployee",
      pe."pensionEmployer",
      pe."loanDeduction",
      pe."otherDeduction",
      pe."grossPay",
      pe."totalDeductions",
      pe."netPay",
      pe.remarks
    FROM "PayrollEmployee" pe
    INNER JOIN "Employee" e ON e.id = pe."employeeId"
    LEFT JOIN "Location" l ON l.id = e."locationId"
    LEFT JOIN "Department" d ON d.id = e."departmentId"
    WHERE pe."payrollRunId" = ${String(headerRows[0].id)}
    ORDER BY e."employeeNo" ASC
  `;

  const accessibleLocationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  if (
    scope?.accessibleLocationIds &&
    accessibleLocationIds.length > 0 &&
    employeeRows.some((row) => row.locationId && !accessibleLocationIds.includes(String(row.locationId)))
  ) {
    return null;
  }

  return {
    ...mapPayrollRun(headerRows[0]),
    remarks: headerRows[0].remarks ? String(headerRows[0].remarks) : null,
    employees: employeeRows.map((row) => ({
      id: String(row.id),
      employeeId: String(row.employeeId),
      employeeNo: String(row.employeeNo),
      employeeName: String(row.employeeName),
      locationId: row.locationId ? String(row.locationId) : null,
      locationName: row.locationName ? String(row.locationName) : null,
      departmentName: row.departmentName ? String(row.departmentName) : null,
      baseSalary: Number(row.baseSalary ?? 0),
      overtimeAmount: Number(row.overtimeAmount ?? 0),
      allowanceAmount: Number(row.allowanceAmount ?? 0),
      bonusAmount: Number(row.bonusAmount ?? 0),
      taxableIncome: Number(row.taxableIncome ?? 0),
      incomeTax: Number(row.incomeTax ?? 0),
      pensionEmployee: Number(row.pensionEmployee ?? 0),
      pensionEmployer: Number(row.pensionEmployer ?? 0),
      loanDeduction: Number(row.loanDeduction ?? 0),
      otherDeduction: Number(row.otherDeduction ?? 0),
      grossPay: Number(row.grossPay ?? 0),
      totalDeductions: Number(row.totalDeductions ?? 0),
      netPay: Number(row.netPay ?? 0),
      remarks: row.remarks ? String(row.remarks) : null,
    })),
  } satisfies PayrollRunDetail;
}

export async function createPayrollRun(payload: PayrollRunPayload, currentUserId: string, scope?: { accessibleLocationIds?: string[] | null }) {
  if (!payload.periodStart || !payload.periodEnd || !payload.paymentDate) {
    throw new Error("Payroll period start, period end, and payment date are required.");
  }

  const periodStart = new Date(payload.periodStart);
  const periodEnd = new Date(payload.periodEnd);
  const paymentDate = new Date(payload.paymentDate);
  if (Number.isNaN(periodStart.getTime()) || Number.isNaN(periodEnd.getTime()) || Number.isNaN(paymentDate.getTime())) {
    throw new Error("Invalid payroll dates supplied.");
  }
  if (periodEnd < periodStart) {
    throw new Error("Payroll period end cannot be before period start.");
  }

  const settings = await getPayrollSettings();
  const accessibleLocationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  if (payload.locationId && scope?.accessibleLocationIds && accessibleLocationIds.length > 0 && !accessibleLocationIds.includes(payload.locationId)) {
    throw new Error("You do not have access to the selected payroll location.");
  }

  return sql.begin(async (tx) => {
    const payrollNo = await getNextPayrollNumber();
    const locationFilter = payload.locationId
      ? sql`AND e."locationId" = ${payload.locationId}`
      : accessibleLocationIds.length
        ? sql`AND e."locationId" IN ${sql(accessibleLocationIds)}`
        : sql``;

    const employees = await tx<Array<{
      id: string;
      employeeNo: string;
      baseSalary: number;
      hireDate: string;
      userId: string | null;
    }>>`
      SELECT id, "employeeNo", "baseSalary", "hireDate"::date::text AS "hireDate", "userId"
      FROM "Employee" e
      WHERE e."isArchived" = false
        AND e."isActive" = true
        AND e.status = 'ACTIVE'
      ${locationFilter}
      ORDER BY e."employeeNo" ASC
    `;

    if (employees.length === 0) {
      throw new Error("No active employees matched the selected payroll scope.");
    }

    const employeeIds = employees.map((employee) => employee.id);
    const overtimeRows = employeeIds.length
      ? await tx<Array<{ employeeId: string; totalAmount: number }>>`
          SELECT
            "employeeId",
            COALESCE(SUM(amount), 0)::double precision AS "totalAmount"
          FROM "OvertimeRequest"
          WHERE "employeeId" IN ${sql(employeeIds)}
            AND status IN ('APPROVED', 'POSTED')
            AND "isArchived" = false
            AND "overtimeDate" >= ${periodStart}
            AND "overtimeDate" <= ${periodEnd}
          GROUP BY "employeeId"
        `
      : [];
    const overtimeByEmployeeId = new Map(overtimeRows.map((row) => [row.employeeId, Number(row.totalAmount ?? 0)]));

    const attendanceRows = employeeIds.length
      ? await tx<Array<{ employeeId: string; attendanceDate: string; status: string }>>`
          SELECT
            da."employeeId",
            da."attendanceDate"::date::text AS "attendanceDate",
            da.status::text AS status
          FROM "DailyAttendance" da
          WHERE da."employeeId" IN ${sql(employeeIds)}
            AND da."isArchived" = false
            AND da."attendanceDate" >= ${periodStart}
            AND da."attendanceDate" <= ${periodEnd}
        `
      : [];
    const attendanceByEmployee = new Map<string, Map<string, string>>();
    for (const row of attendanceRows) {
      const dates = attendanceByEmployee.get(row.employeeId) ?? new Map<string, string>();
      dates.set(String(row.attendanceDate), String(row.status));
      attendanceByEmployee.set(row.employeeId, dates);
    }

    const leaveRows = employeeIds.length
      ? await tx<Array<{ employeeId: string; startDate: string; endDate: string; paid: boolean }>>`
          SELECT
            lr."employeeId",
            lr."startDate"::date::text AS "startDate",
            lr."endDate"::date::text AS "endDate",
            lt.paid
          FROM "LeaveRequest" lr
          INNER JOIN "LeaveType" lt ON lt.id = lr."leaveTypeId"
          WHERE lr."employeeId" IN ${sql(employeeIds)}
            AND lr."isArchived" = false
            AND lr.status = 'APPROVED'
            AND lr."startDate" <= ${periodEnd}
            AND lr."endDate" >= ${periodStart}
        `
      : [];
    const leaveByEmployee = new Map<string, Array<{ startDate: string; endDate: string; paid: boolean }>>();
    for (const row of leaveRows) {
      const leaves = leaveByEmployee.get(row.employeeId) ?? [];
      leaves.push({ startDate: row.startDate, endDate: row.endDate, paid: Boolean(row.paid) });
      leaveByEmployee.set(row.employeeId, leaves);
    }

    const componentRows = employeeIds.length
      ? await tx<Array<{
          employeeId: string;
          type: string;
          taxable: boolean;
          amount: number | null;
          ratePercent: number | null;
          defaultAmount: number | null;
        }>>`
          SELECT
            epa."employeeId",
            pc.type::text AS type,
            pc.taxable,
            epa.amount,
            epa."ratePercent",
            pc."defaultAmount"
          FROM "EmployeePayrollAssignment" epa
          INNER JOIN "PayrollComponent" pc ON pc.id = epa."payrollComponentId"
          WHERE epa."isArchived" = false
            AND epa."isActive" = true
            AND pc."isArchived" = false
            AND pc."isActive" = true
            AND epa."employeeId" IN ${sql(employeeIds)}
            AND (epa."effectiveFrom" IS NULL OR epa."effectiveFrom" <= ${periodEnd})
            AND (epa."effectiveTo" IS NULL OR epa."effectiveTo" >= ${periodStart})
          ORDER BY pc.code ASC
        `
      : [];
    const componentsByEmployee = new Map<string, Array<{
      employeeId: string;
      type: string;
      taxable: boolean;
      amount: number | null;
      ratePercent: number | null;
      defaultAmount: number | null;
    }>>();
    for (const row of componentRows) {
      const employeeComponents = componentsByEmployee.get(row.employeeId) ?? [];
      employeeComponents.push(row);
      componentsByEmployee.set(row.employeeId, employeeComponents);
    }

    const workingDates = enumerateDateKeys(periodStart, periodEnd).filter((dateKey) => resolvePayrollDayType(dateKey, settings) === "NORMAL");

    const payrollRunRows = await tx<Array<{ id: string; publicId: number }>>`
      INSERT INTO "PayrollRun" (
        "payrollNo",
        "periodStart",
        "periodEnd",
        "paymentDate",
        status,
        "grossPay",
        "totalDeductions",
        "netPay",
        "createdById",
        remarks,
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${payrollNo},
        ${periodStart},
        ${periodEnd},
        ${paymentDate},
        'DRAFT',
        0,
        0,
        0,
        ${currentUserId},
        ${normalizeNullableString(payload.remarks)},
        false,
        NOW(),
        NOW()
      )
      RETURNING id, "publicId"
    `;

    const payrollRunId = payrollRunRows[0]?.id;
    if (!payrollRunId) {
      throw new Error("Failed to create payroll run.");
    }

    let grossPayTotal = 0;
    let deductionsTotal = 0;
    let netPayTotal = 0;

    for (const employee of employees) {
      const contractBaseSalary = Number(employee.baseSalary ?? 0);
      const overtimeAmount = Number(overtimeByEmployeeId.get(employee.id) ?? 0);
      const hireDateKey = normalizeDateKey(employee.hireDate);
      const eligibleWorkingDates = workingDates.filter((dateKey) => dateKey >= hireDateKey);
      const attendedDates = attendanceByEmployee.get(employee.id) ?? new Map<string, string>();
      const paidLeaveDates = new Set<string>();
      const unpaidLeaveDates = new Set<string>();

      for (const leave of leaveByEmployee.get(employee.id) ?? []) {
        for (const dateKey of enumerateDateKeys(new Date(leave.startDate), new Date(leave.endDate))) {
          if (!eligibleWorkingDates.includes(dateKey)) {
            continue;
          }
          if (leave.paid) {
            paidLeaveDates.add(dateKey);
          } else {
            unpaidLeaveDates.add(dateKey);
          }
        }
      }

      const payableDays = settings.attendanceRequiredForSalary
        ? eligibleWorkingDates.filter((dateKey) => attendedDates.get(dateKey) === "PRESENT" || paidLeaveDates.has(dateKey)).length
        : Math.min(eligibleWorkingDates.length, settings.standardWorkDaysPerMonth);
      const dailyRate = settings.standardWorkDaysPerMonth > 0 ? contractBaseSalary / settings.standardWorkDaysPerMonth : 0;
      const baseSalary = Number((dailyRate * payableDays).toFixed(2));

      let allowanceAmount = 0;
      let bonusAmount = 0;
      let taxableExtras = 0;
      let loanDeduction = 0;
      let otherDeduction = 0;
      let extraTax = 0;
      let pensionComponentDeduction = 0;

      for (const component of componentsByEmployee.get(employee.id) ?? []) {
        const componentAmount = component.ratePercent != null
          ? Number(((contractBaseSalary * Number(component.ratePercent)) / 100).toFixed(2))
          : Number(component.amount ?? component.defaultAmount ?? 0);

        if (component.type === "ALLOWANCE") {
          allowanceAmount += componentAmount;
          if (component.taxable) taxableExtras += componentAmount;
        } else if (component.type === "BONUS") {
          bonusAmount += componentAmount;
          if (component.taxable) taxableExtras += componentAmount;
        } else if (component.type === "LOAN") {
          loanDeduction += componentAmount;
        } else if (component.type === "TAX") {
          extraTax += componentAmount;
        } else if (component.type === "PENSION") {
          pensionComponentDeduction += componentAmount;
        } else {
          otherDeduction += componentAmount;
        }
      }

      const taxableIncome = Number((baseSalary + overtimeAmount + taxableExtras).toFixed(2));
      const incomeTax = Number((taxableIncome * (settings.taxPercent / 100)).toFixed(2));
      const pensionEmployee = Number((baseSalary * (settings.employeePensionPercent / 100)).toFixed(2));
      const pensionEmployer = Number((baseSalary * (settings.employerPensionPercent / 100)).toFixed(2));
      const grossPay = Number((baseSalary + overtimeAmount + allowanceAmount + bonusAmount).toFixed(2));
      const totalDeductions = Number((incomeTax + extraTax + pensionEmployee + pensionComponentDeduction + loanDeduction + otherDeduction).toFixed(2));
      const netPay = Number((grossPay - totalDeductions).toFixed(2));
      const absenceDays = Math.max(0, eligibleWorkingDates.length - payableDays - unpaidLeaveDates.size);
      const lineRemarks = `Payable days ${payableDays}/${eligibleWorkingDates.length}; unpaid leave ${unpaidLeaveDates.size}; absences ${absenceDays}`;

      grossPayTotal += grossPay;
      deductionsTotal += totalDeductions;
      netPayTotal += netPay;

      await tx`
        INSERT INTO "PayrollEmployee" (
          "payrollRunId",
          "employeeId",
          "baseSalary",
          "overtimeAmount",
          "allowanceAmount",
          "bonusAmount",
          "taxableIncome",
          "incomeTax",
          "pensionEmployee",
          "pensionEmployer",
          "loanDeduction",
          "otherDeduction",
          "grossPay",
          "totalDeductions",
          "netPay",
          remarks,
          "createdAt",
          "updatedAt"
        )
        VALUES (
          ${payrollRunId},
          ${employee.id},
          ${baseSalary},
          ${overtimeAmount},
          ${allowanceAmount},
          ${bonusAmount},
          ${taxableIncome},
          ${incomeTax},
          ${pensionEmployee},
          ${pensionEmployer},
          ${loanDeduction},
          ${otherDeduction},
          ${grossPay},
          ${totalDeductions},
          ${netPay},
          ${lineRemarks},
          NOW(),
          NOW()
        )
      `;
    }

    await tx`
      UPDATE "PayrollRun"
      SET
        "grossPay" = ${Number(grossPayTotal.toFixed(2))},
        "totalDeductions" = ${Number(deductionsTotal.toFixed(2))},
        "netPay" = ${Number(netPayTotal.toFixed(2))},
        "updatedAt" = NOW()
      WHERE id = ${payrollRunId}
    `;

    return { id: payrollRunId, publicId: Number(payrollRunRows[0]?.publicId ?? 0) };
  });
}

export async function changePayrollRunStatus(input: {
  id: string;
  action: "submit" | "approve" | "post" | "cancel";
  userId: string;
}) {
  const run = await getPayrollRunById(input.id);
  if (!run) {
    throw new Error("Payroll run not found.");
  }

  if (input.action === "submit") {
    if (run.status !== "DRAFT") {
      throw new Error("Only draft payroll runs can be submitted.");
    }
    await sql`
      UPDATE "PayrollRun"
      SET status = 'SUBMITTED', "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    return;
  }

  if (input.action === "cancel") {
    if (!["DRAFT", "SUBMITTED", "APPROVED"].includes(run.status)) {
      throw new Error("Only open payroll runs can be cancelled.");
    }
    await sql`
      UPDATE "PayrollRun"
      SET status = 'CANCELLED', "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    return;
  }

  if (input.action === "approve") {
    if (!["DRAFT", "SUBMITTED"].includes(run.status)) {
      throw new Error("Only draft or submitted payroll runs can be approved.");
    }
    await sql`
      UPDATE "PayrollRun"
      SET
        status = 'APPROVED',
        "approvedById" = ${input.userId},
        "approvedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    return;
  }

  if (run.status !== "APPROVED") {
    throw new Error("Only approved payroll runs can be posted.");
  }

  await sql.begin(async (tx) => {
    const settings = await getPayrollSettings();

    await tx`
      UPDATE "PayrollRun"
      SET
        status = 'POSTED',
        "postedById" = ${input.userId},
        "postedAt" = NOW(),
        "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;

    await tx`
      UPDATE "OvertimeRequest"
      SET
        status = 'POSTED',
        "updatedAt" = NOW()
      WHERE status = 'APPROVED'
        AND "employeeId" IN (
          SELECT "employeeId" FROM "PayrollEmployee" WHERE "payrollRunId" = ${input.id}
        )
        AND "overtimeDate" >= (SELECT "periodStart" FROM "PayrollRun" WHERE id = ${input.id})
        AND "overtimeDate" <= (SELECT "periodEnd" FROM "PayrollRun" WHERE id = ${input.id})
    `;

    const payrollRows = await tx<Array<{
      payrollNo: string;
      paymentDate: Date;
      grossPay: number;
      totalDeductions: number;
      netPay: number;
      employeePension: number;
      employerPension: number;
      incomeTax: number;
    }>>`
      SELECT
        pr."payrollNo",
        pr."paymentDate",
        pr."grossPay",
        pr."totalDeductions",
        pr."netPay",
        COALESCE(SUM(pe."pensionEmployee"), 0)::double precision AS "employeePension",
        COALESCE(SUM(pe."pensionEmployer"), 0)::double precision AS "employerPension",
        COALESCE(SUM(pe."incomeTax"), 0)::double precision AS "incomeTax"
      FROM "PayrollRun" pr
      LEFT JOIN "PayrollEmployee" pe ON pe."payrollRunId" = pr.id
      WHERE pr.id = ${input.id}
      GROUP BY pr.id
      LIMIT 1
    `;

    const payroll = payrollRows[0];
    if (!payroll) {
      throw new Error("Payroll run totals could not be resolved for posting.");
    }

    await syncPayrollJournalEntry(tx, {
      sourceId: input.id,
      description: `Payroll posting ${payroll.payrollNo}`,
      entryDate: payroll.paymentDate,
      postedById: input.userId,
      grossPay: Number(payroll.grossPay ?? 0),
      netPay: Number(payroll.netPay ?? 0),
      incomeTax: Number(payroll.incomeTax ?? 0),
      employeePension: Number(payroll.employeePension ?? 0),
      employerPension: Number(payroll.employerPension ?? 0),
      totalDeductions: Number(payroll.totalDeductions ?? 0),
      salaryExpenseAccountId: settings.salaryExpenseAccountId,
      employerPensionExpenseAccountId: settings.employerPensionExpenseAccountId,
      salaryPayableAccountId: settings.salaryPayableAccountId,
      taxPayableAccountId: settings.taxPayableAccountId,
      pensionPayableAccountId: settings.pensionPayableAccountId,
    });
  });
}

export async function listPayrollPaymentBankAccounts(scope?: { accessibleLocationIds?: string[] | null }) {
  const locationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  if (scope?.accessibleLocationIds && locationIds.length === 0) return [];
  return sql<Array<{ id: string; label: string; currency: string; currentBalance: number }>>`
    SELECT id, CONCAT("accountCode", ' - ', "accountName", ' (', currency, ')') AS label,
      currency, "currentBalance"
    FROM "BankAccount"
    WHERE "isArchived" = false AND "isActive" = true AND "allowPayments" = true
      AND (${locationIds.length ? sql`("locationId" IS NULL OR "locationId" IN ${sql(locationIds)})` : sql`TRUE`})
    ORDER BY "isDefault" DESC, "accountCode" ASC
  `;
}

export async function payPayrollRun(input: { id: string; bankAccountId: string; userId: string; accessibleLocationIds?: string[] | null }) {
  const locationIds = (input.accessibleLocationIds ?? []).filter(Boolean);
  if (input.accessibleLocationIds && locationIds.length === 0) {
    throw new Error("You do not have access to a payroll payment location");
  }
  return sql.begin(async (tx) => {
    const runRows = await tx<Array<{ id: string; payrollNo: string; status: string; netPay: number; paymentDate: Date }>>`
      SELECT id, "payrollNo", status::text AS status, "netPay", "paymentDate"
      FROM "PayrollRun" WHERE id = ${input.id} AND "isArchived" = false LIMIT 1 FOR UPDATE
    `;
    const run = runRows[0];
    if (!run) throw new Error("Payroll run not found");
    if (run.status !== "POSTED") throw new Error("Only posted payroll runs can be paid");

    const bankRows = await tx<Array<{ id: string; accountName: string; currentBalance: number; currency: string }>>`
      SELECT id, "accountName", "currentBalance", currency
      FROM "BankAccount"
      WHERE id = ${input.bankAccountId} AND "isArchived" = false AND "isActive" = true AND "allowPayments" = true
        AND (${input.accessibleLocationIds ? sql`("locationId" IS NULL OR "locationId" IN ${sql(locationIds)})` : sql`TRUE`})
      LIMIT 1 FOR UPDATE
    `;
    const bank = bankRows[0];
    if (!bank) throw new Error("Selected bank account is not available for payments");
    const amount = Number(run.netPay ?? 0);
    if (Number(bank.currentBalance ?? 0) < amount) throw new Error("Bank account balance is insufficient for this payroll payment");
    const settings = await getPayrollSettings();
    const journal = await syncPayrollPaymentJournal(tx, {
      sourceId: run.id,
      description: `Payroll payment ${run.payrollNo} from ${bank.accountName}`,
      entryDate: run.paymentDate,
      postedById: input.userId,
      amount,
      salaryPayableAccountId: settings.salaryPayableAccountId,
    });
    await tx`
      UPDATE "BankAccount"
      SET "currentBalance" = "currentBalance" - ${amount}, "updatedById" = ${input.userId}, "updatedAt" = NOW()
      WHERE id = ${bank.id}
    `;
    return { ...journal, amount, bankAccountId: bank.id, currency: bank.currency };
  });
}

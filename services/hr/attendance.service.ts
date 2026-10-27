import { randomUUID } from "node:crypto";

import { sql } from "@/lib/db";
import type { Tx } from "@/services/production/production-shared.service";

export interface DailyAttendanceRecord {
  id: string;
  employeeId: string;
  employeeNo: string;
  employeeName: string;
  locationId?: string | null;
  locationName?: string | null;
  userId?: string | null;
  userName?: string | null;
  attendanceDate: string;
  shiftSessionId?: string | null;
  shiftCode?: string | null;
  status: string;
  approvalStatus: string;
  approvedById?: string | null;
  approvedByName?: string | null;
  approvedAt?: string | null;
  sourceType: string;
  hoursWorked: number;
  overtimeHours: number;
  remarks?: string | null;
}

export interface DailyAttendancePayload {
  employeeId: string;
  attendanceDate: string;
  locationId?: string | null;
  status: string;
  hoursWorked?: number;
  overtimeHours?: number;
  remarks?: string | null;
}

export interface WorkCalendarSettingsRecord {
  standardWorkDaysPerMonth: number;
  attendanceRequiredForSalary: boolean;
  weekendDays: number[];
  holidayDates: string[];
  holidayEntries: HolidayCalendarEntryRecord[];
  holidayTemplates: HolidayTemplateRecord[];
}

export interface DailyAttendanceListScope {
  accessibleLocationIds?: string[] | null;
  employeeId?: string | null;
}

export interface HolidayCalendarEntryRecord {
  id: string;
  name: string;
  date: string;
  sourceType: "CUSTOM" | "GENERATED";
  templateId?: string | null;
  remarks?: string | null;
  isActive: boolean;
}

export interface HolidayTemplateRecord {
  id: string;
  name: string;
  month: number;
  day: number;
  remarks?: string | null;
  isActive: boolean;
}

export interface BulkAttendanceEntryPayload {
  employeeId: string;
  status?: string;
  hoursWorked?: number;
  overtimeHours?: number;
  remarks?: string | null;
}

export interface BulkAttendancePayload {
  attendanceDate: string;
  locationId?: string | null;
  entries: BulkAttendanceEntryPayload[];
}

export interface MonthlyAttendanceDayRecord {
  attendanceDate: string;
  dayLabel: string;
  status: string;
  approvalStatus: string;
  hoursWorked: number;
  overtimeHours: number;
  remarks?: string | null;
  existingId?: string;
}

export interface MonthlyAttendanceSheetRecord {
  employeeId: string;
  employeeLabel: string;
  month: string;
  days: MonthlyAttendanceDayRecord[];
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

function parseHolidayEntries(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) {
      return [] as HolidayCalendarEntryRecord[];
    }
    return parsed
      .map((entry) => ({
        id: String(entry?.id ?? randomUUID()),
        name: String(entry?.name ?? "").trim(),
        date: String(entry?.date ?? "").slice(0, 10),
        sourceType: (entry?.sourceType === "GENERATED" ? "GENERATED" : "CUSTOM") as "CUSTOM" | "GENERATED",
        templateId: normalizeNullableString(entry?.templateId),
        remarks: normalizeNullableString(entry?.remarks),
        isActive: entry?.isActive !== false,
      }) satisfies HolidayCalendarEntryRecord)
      .filter((entry) => entry.name && /^\d{4}-\d{2}-\d{2}$/.test(entry.date));
  } catch {
    return [] as HolidayCalendarEntryRecord[];
  }
}

function parseHolidayTemplates(value: string | null | undefined) {
  try {
    const parsed = JSON.parse(value ?? "[]");
    if (!Array.isArray(parsed)) {
      return [] as HolidayTemplateRecord[];
    }
    return parsed
      .map((entry) => ({
        id: String(entry?.id ?? randomUUID()),
        name: String(entry?.name ?? "").trim(),
        month: Number(entry?.month ?? 0),
        day: Number(entry?.day ?? 0),
        remarks: normalizeNullableString(entry?.remarks),
        isActive: entry?.isActive !== false,
      }))
      .filter((entry) => entry.name && Number.isInteger(entry.month) && entry.month >= 1 && entry.month <= 12 && Number.isInteger(entry.day) && entry.day >= 1 && entry.day <= 31);
  } catch {
    return [] as HolidayTemplateRecord[];
  }
}

function normalizeAttendanceStatus(value: string | null | undefined) {
  const normalized = String(value ?? "PRESENT").trim().toUpperCase();
  switch (normalized) {
    case "ABSENT":
    case "LEAVE":
    case "OFF":
    case "HOLIDAY":
      return normalized;
    default:
      return "PRESENT";
  }
}

async function getWorkCalendarSettingMap() {
  const rows = await sql<Array<{ key: string; value: string }>>`
    SELECT key, value
    FROM "ModuleSetting"
    WHERE module = 'hr'
      AND "isArchived" = false
      AND key IN (
        'payroll.standardWorkDaysPerMonth',
        'payroll.attendanceRequiredForSalary',
        'payroll.weekendDays',
        'payroll.holidayDates',
        'payroll.holidayEntries',
        'payroll.holidayTemplates'
      )
  `;

  return new Map(rows.map((row) => [row.key, row.value]));
}

export async function getWorkCalendarSettings(): Promise<WorkCalendarSettingsRecord> {
  const settingsMap = await getWorkCalendarSettingMap();
  const holidayEntries = parseHolidayEntries(settingsMap.get("payroll.holidayEntries"));
  const holidayTemplates = parseHolidayTemplates(settingsMap.get("payroll.holidayTemplates"));
  const legacyHolidayDates = parseStringArray(settingsMap.get("payroll.holidayDates"));
  const mergedHolidayDates = Array.from(new Set([
    ...holidayEntries.filter((entry) => entry.isActive).map((entry) => entry.date),
    ...legacyHolidayDates,
  ])).sort();
  return {
    standardWorkDaysPerMonth: toNumber(settingsMap.get("payroll.standardWorkDaysPerMonth"), 26),
    attendanceRequiredForSalary: toBoolean(settingsMap.get("payroll.attendanceRequiredForSalary"), true),
    weekendDays: parseNumberArray(settingsMap.get("payroll.weekendDays"), [0]),
    holidayDates: mergedHolidayDates,
    holidayEntries,
    holidayTemplates,
  };
}

export async function updateWorkCalendarSettings(input: WorkCalendarSettingsRecord) {
  const holidayEntries: HolidayCalendarEntryRecord[] = (input.holidayEntries ?? []).map((entry) => ({
    id: entry.id || randomUUID(),
    name: String(entry.name ?? "").trim(),
    date: String(entry.date ?? "").slice(0, 10),
    sourceType: (entry.sourceType === "GENERATED" ? "GENERATED" : "CUSTOM") as "CUSTOM" | "GENERATED",
    templateId: normalizeNullableString(entry.templateId),
    remarks: normalizeNullableString(entry.remarks),
    isActive: entry.isActive !== false,
  })).filter((entry) => entry.name && /^\d{4}-\d{2}-\d{2}$/.test(entry.date));
  const holidayTemplates = (input.holidayTemplates ?? []).map((entry) => ({
    id: entry.id || randomUUID(),
    name: String(entry.name ?? "").trim(),
    month: Number(entry.month),
    day: Number(entry.day),
    remarks: normalizeNullableString(entry.remarks),
    isActive: entry.isActive !== false,
  })).filter((entry) => entry.name && Number.isInteger(entry.month) && entry.month >= 1 && entry.month <= 12 && Number.isInteger(entry.day) && entry.day >= 1 && entry.day <= 31);
  const holidayDates = Array.from(new Set(holidayEntries.filter((entry) => entry.isActive).map((entry) => entry.date))).sort();

  const settings = [
    { key: "payroll.standardWorkDaysPerMonth", value: String(Number(input.standardWorkDaysPerMonth ?? 26)) },
    { key: "payroll.attendanceRequiredForSalary", value: input.attendanceRequiredForSalary ? "true" : "false" },
    { key: "payroll.weekendDays", value: JSON.stringify(input.weekendDays ?? []) },
    { key: "payroll.holidayDates", value: JSON.stringify(holidayDates) },
    { key: "payroll.holidayEntries", value: JSON.stringify(holidayEntries) },
    { key: "payroll.holidayTemplates", value: JSON.stringify(holidayTemplates) },
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

export async function generateHolidayCalendarForYear(year: number) {
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    throw new Error("Holiday generation year must be between 2000 and 2100.");
  }

  const settings = await getWorkCalendarSettings();
  const generatedEntries = settings.holidayTemplates
    .filter((template) => template.isActive)
    .map<HolidayCalendarEntryRecord>((template) => ({
      id: randomUUID(),
      name: template.name,
      date: `${year}-${String(template.month).padStart(2, "0")}-${String(template.day).padStart(2, "0")}`,
      sourceType: "GENERATED",
      templateId: template.id,
      remarks: template.remarks ?? null,
      isActive: true,
    }));

  const preservedCustomEntries = settings.holidayEntries.filter((entry) => {
    if (entry.sourceType !== "CUSTOM") {
      return !entry.date.startsWith(`${year}-`);
    }
    return true;
  });
  const preservedGeneratedEntries = settings.holidayEntries.filter((entry) => entry.sourceType === "GENERATED" && !entry.date.startsWith(`${year}-`));

  const mergedEntriesByDateName = new Map<string, HolidayCalendarEntryRecord>();
  for (const entry of [...preservedCustomEntries, ...preservedGeneratedEntries, ...generatedEntries]) {
    mergedEntriesByDateName.set(`${entry.date}::${entry.name}`.toLowerCase(), entry);
  }

  const nextSettings: WorkCalendarSettingsRecord = {
    ...settings,
    holidayEntries: Array.from(mergedEntriesByDateName.values()).sort((left, right) => left.date.localeCompare(right.date) || left.name.localeCompare(right.name)),
    holidayDates: [],
  };

  await updateWorkCalendarSettings(nextSettings);
  return getWorkCalendarSettings();
}

export async function getAttendanceReferenceData(scope?: { accessibleLocationIds?: string[] | null }) {
  const accessibleLocationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  const locationScope = accessibleLocationIds.length ? sql`AND e."locationId" IN ${sql(accessibleLocationIds)}` : sql``;
  const locationListScope = accessibleLocationIds.length ? sql`AND id IN ${sql(accessibleLocationIds)}` : sql``;

  const [employees, locations] = await Promise.all([
    sql<Array<{ value: string; label: string; locationId: string | null }>>`
      SELECT
        e.id AS value,
        CONCAT(e."employeeNo", ' - ', e."firstName", ' ', e."lastName") AS label,
        e."locationId"
      FROM "Employee" e
      WHERE e."isArchived" = false
        AND e."isActive" = true
      ${locationScope}
      ORDER BY e."employeeNo" ASC
    `,
    sql<Array<{ value: string; label: string }>>`
      SELECT id AS value, CONCAT("locationCode", ' - ', "locationName") AS label
      FROM "Location"
      WHERE "isArchived" = false
        AND "isActive" = true
      ${locationListScope}
      ORDER BY "locationName" ASC
    `,
  ]);

  return {
    employees,
    locations,
    statusOptions: ["PRESENT", "ABSENT", "LEAVE", "OFF", "HOLIDAY"].map((value) => ({ value, label: value })),
  };
}

export async function listDailyAttendance(scope?: DailyAttendanceListScope) {
  const accessibleLocationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  const locationScope = accessibleLocationIds.length
    ? sql`AND COALESCE(da."locationId", e."locationId") IN ${sql(accessibleLocationIds)}`
    : sql``;
  const employeeScope = normalizeNullableString(scope?.employeeId) ? sql`AND da."employeeId" = ${normalizeNullableString(scope?.employeeId)}` : sql``;

  return sql<Array<DailyAttendanceRecord>>`
    SELECT
      da.id,
      da."employeeId",
      e."employeeNo",
      CONCAT_WS(' ', e."firstName", e."middleName", e."lastName") AS "employeeName",
      COALESCE(da."locationId", e."locationId") AS "locationId",
      l."locationName",
      da."userId",
      u.name AS "userName",
      da."attendanceDate"::date::text AS "attendanceDate",
      da."shiftSessionId",
      da."shiftCode",
      da.status::text AS status,
      da."approvalStatus"::text AS "approvalStatus",
      da."approvedById",
      approver.name AS "approvedByName",
      da."approvedAt"::text AS "approvedAt",
      da."sourceType"::text AS "sourceType",
      da."hoursWorked",
      da."overtimeHours",
      da.remarks
    FROM "DailyAttendance" da
    INNER JOIN "Employee" e ON e.id = da."employeeId"
    LEFT JOIN "Location" l ON l.id = COALESCE(da."locationId", e."locationId")
    LEFT JOIN "User" u ON u.id = da."userId"
    LEFT JOIN "User" approver ON approver.id = da."approvedById"
    WHERE da."isArchived" = false
    ${locationScope}
    ${employeeScope}
    ORDER BY da."attendanceDate" DESC, e."employeeNo" ASC
  `;
}

async function assertAttendanceScope(
  payload: DailyAttendancePayload,
  scope?: { accessibleLocationIds?: string[] | null },
) {
  const employeeRows = await sql<Array<{ id: string; locationId: string | null; userId: string | null }>>`
    SELECT id, "locationId", "userId"
    FROM "Employee"
    WHERE id = ${payload.employeeId}
      AND "isArchived" = false
      AND "isActive" = true
    LIMIT 1
  `;

  const employee = employeeRows[0];
  if (!employee) {
    throw new Error("Selected employee was not found.");
  }

  const resolvedLocationId = normalizeNullableString(payload.locationId) ?? employee.locationId ?? null;
  const accessibleLocationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  if (scope?.accessibleLocationIds && accessibleLocationIds.length > 0 && resolvedLocationId && !accessibleLocationIds.includes(resolvedLocationId)) {
    throw new Error("You do not have access to the selected attendance location.");
  }

  if (resolvedLocationId) {
    const locationRows = await sql<Array<{ id: string }>>`
      SELECT id
      FROM "Location"
      WHERE id = ${resolvedLocationId}
        AND "isArchived" = false
      LIMIT 1
    `;
    if (!locationRows[0]) {
      throw new Error("Selected attendance location was not found.");
    }
  }

  return {
    employeeId: employee.id,
    locationId: resolvedLocationId,
    userId: employee.userId,
  };
}

export async function upsertManualDailyAttendance(
  payload: DailyAttendancePayload,
  userId: string,
  scope?: { accessibleLocationIds?: string[] | null },
) {
  if (!payload.employeeId || !payload.attendanceDate) {
    throw new Error("Employee and attendance date are required.");
  }

  const normalizedDate = new Date(payload.attendanceDate);
  if (Number.isNaN(normalizedDate.getTime())) {
    throw new Error("Invalid attendance date supplied.");
  }

  const resolved = await assertAttendanceScope(payload, scope);
  const status = normalizeAttendanceStatus(payload.status);

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO "DailyAttendance" (
      id,
      "employeeId",
      "attendanceDate",
      "locationId",
      "userId",
      status,
      "approvalStatus",
      "approvedById",
      "approvedAt",
      "sourceType",
      "hoursWorked",
      "overtimeHours",
      remarks,
      "isArchived",
      "createdById",
      "updatedById",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${randomUUID()},
      ${resolved.employeeId},
      ${normalizedDate},
      ${resolved.locationId},
      ${resolved.userId},
      ${status}::"DailyAttendanceStatus",
      'DRAFT'::"AttendanceApprovalStatus",
      NULL,
      NULL,
      'MANUAL'::"AttendanceSourceType",
      ${Math.max(0, Number(payload.hoursWorked ?? 0))},
      ${Math.max(0, Number(payload.overtimeHours ?? 0))},
      ${normalizeNullableString(payload.remarks)},
      false,
      ${userId},
      ${userId},
      NOW(),
      NOW()
    )
    ON CONFLICT ("employeeId", "attendanceDate", "isArchived") DO UPDATE SET
      "locationId" = EXCLUDED."locationId",
      "userId" = EXCLUDED."userId",
      status = EXCLUDED.status,
      "approvalStatus" = 'DRAFT'::"AttendanceApprovalStatus",
      "approvedById" = NULL,
      "approvedAt" = NULL,
      "sourceType" = 'MANUAL'::"AttendanceSourceType",
      "hoursWorked" = EXCLUDED."hoursWorked",
      "overtimeHours" = EXCLUDED."overtimeHours",
      remarks = EXCLUDED.remarks,
      "updatedById" = EXCLUDED."updatedById",
      "updatedAt" = NOW()
    RETURNING id
  `;

  return rows[0]?.id ?? null;
}

export async function bulkUpsertManualDailyAttendance(
  payload: BulkAttendancePayload,
  userId: string,
  scope?: { accessibleLocationIds?: string[] | null },
) {
  if (!payload.attendanceDate) {
    throw new Error("Attendance date is required for bulk attendance.");
  }

  const normalizedDate = new Date(payload.attendanceDate);
  if (Number.isNaN(normalizedDate.getTime())) {
    throw new Error("Invalid attendance date supplied.");
  }

  const entries = (payload.entries ?? []).filter((entry) => normalizeNullableString(entry.employeeId));
  if (!entries.length) {
    throw new Error("Select at least one employee for bulk attendance.");
  }

  const ids: string[] = [];
  for (const entry of entries) {
    const id = await upsertManualDailyAttendance(
      {
        employeeId: entry.employeeId,
        attendanceDate: payload.attendanceDate,
        locationId: payload.locationId ?? null,
        status: entry.status ?? "PRESENT",
        hoursWorked: entry.hoursWorked ?? 1,
        overtimeHours: entry.overtimeHours ?? 0,
        remarks: entry.remarks ?? null,
      },
      userId,
      scope,
    );
    if (id) {
      ids.push(id);
    }
  }

  return ids;
}

function getMonthDateRange(month: string) {
  const normalized = String(month ?? "").trim();
  if (!/^\d{4}-\d{2}$/.test(normalized)) {
    throw new Error("Month must be in YYYY-MM format.");
  }
  const start = new Date(`${normalized}-01T00:00:00`);
  const end = new Date(start);
  end.setMonth(end.getMonth() + 1);
  end.setDate(0);
  return { start, end, month: normalized };
}

export async function getMonthlyAttendanceSheet(
  employeeId: string,
  month: string,
  scope?: { accessibleLocationIds?: string[] | null },
) {
  const employeeKey = normalizeNullableString(employeeId);
  if (!employeeKey) {
    throw new Error("Employee is required for monthly attendance sheet.");
  }

  const { start, end, month: normalizedMonth } = getMonthDateRange(month);
  const resolved = await assertAttendanceScope({
    employeeId: employeeKey,
    attendanceDate: start.toISOString().slice(0, 10),
    status: "PRESENT",
  }, scope);

  const employeeRows = await sql<Array<{ label: string }>>`
    SELECT CONCAT("employeeNo", ' - ', "firstName", ' ', "lastName") AS label
    FROM "Employee"
    WHERE id = ${resolved.employeeId}
    LIMIT 1
  `;

  const rows = await sql<Array<{
    id: string;
    attendanceDate: string;
    status: string;
    approvalStatus: string;
    hoursWorked: number;
    overtimeHours: number;
    remarks: string | null;
  }>>`
    SELECT
      id,
      "attendanceDate"::date::text AS "attendanceDate",
      status::text AS status,
      "approvalStatus"::text AS "approvalStatus",
      "hoursWorked",
      "overtimeHours",
      remarks
    FROM "DailyAttendance"
    WHERE "employeeId" = ${resolved.employeeId}
      AND "attendanceDate" >= ${start}
      AND "attendanceDate" <= ${end}
      AND "isArchived" = false
    ORDER BY "attendanceDate" ASC
  `;

  const byDate = new Map(rows.map((row) => [row.attendanceDate, row]));
  const days: MonthlyAttendanceDayRecord[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const dateKey = cursor.toISOString().slice(0, 10);
    const existing = byDate.get(dateKey);
    days.push({
      attendanceDate: dateKey,
      dayLabel: cursor.toLocaleDateString("en-KE", { weekday: "short", day: "2-digit" }),
      status: existing?.status ?? "ABSENT",
      approvalStatus: existing?.approvalStatus ?? "DRAFT",
      hoursWorked: existing?.hoursWorked ?? 0,
      overtimeHours: existing?.overtimeHours ?? 0,
      remarks: existing?.remarks ?? null,
      existingId: existing?.id,
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  return {
    employeeId: resolved.employeeId,
    employeeLabel: employeeRows[0]?.label ?? "Employee",
    month: normalizedMonth,
    days,
  };
}

export async function saveMonthlyAttendanceSheet(
  employeeId: string,
  month: string,
  days: Array<{
    attendanceDate: string;
    status: string;
    hoursWorked?: number;
    overtimeHours?: number;
    remarks?: string | null;
  }>,
  userId: string,
  scope?: { accessibleLocationIds?: string[] | null },
) {
  getMonthDateRange(month);
  if (!days.length) {
    throw new Error("Monthly attendance sheet has no day rows to save.");
  }

  const ids: string[] = [];
  for (const day of days) {
    const id = await upsertManualDailyAttendance({
      employeeId,
      attendanceDate: day.attendanceDate,
      status: day.status,
      hoursWorked: day.hoursWorked ?? 0,
      overtimeHours: day.overtimeHours ?? 0,
      remarks: day.remarks ?? null,
    }, userId, scope);
    if (id) {
      ids.push(id);
    }
  }
  return ids;
}

export async function changeDailyAttendanceApprovalStatus(
  id: string,
  action: "approve" | "reject" | "reset",
  userId: string,
  scope?: { accessibleLocationIds?: string[] | null },
) {
  const rows = await sql<Array<{ id: string; sourceType: string; locationId: string | null }>>`
    SELECT id, "sourceType"::text AS "sourceType", "locationId"
    FROM "DailyAttendance"
    WHERE id = ${id}
      AND "isArchived" = false
    LIMIT 1
  `;

  const current = rows[0];
  if (!current) {
    throw new Error("Attendance record not found.");
  }

  const accessibleLocationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  if (scope?.accessibleLocationIds && accessibleLocationIds.length > 0 && current.locationId && !accessibleLocationIds.includes(current.locationId)) {
    throw new Error("You do not have access to this attendance record.");
  }
  if (current.sourceType === "SHIFT" && action === "reject") {
    throw new Error("Shift-synced attendance cannot be rejected from HR attendance.");
  }

  const approvalStatus =
    action === "approve"
      ? "APPROVED"
      : action === "reject"
        ? "REJECTED"
        : "DRAFT";

  await sql`
    UPDATE "DailyAttendance"
    SET
      "approvalStatus" = ${approvalStatus}::"AttendanceApprovalStatus",
      "approvedById" = ${action === "approve" ? userId : null},
      "approvedAt" = ${action === "approve" ? sql`NOW()` : null},
      "updatedById" = ${userId},
      "updatedAt" = NOW()
    WHERE id = ${id}
      AND "isArchived" = false
  `;

  return id;
}

export async function updateDailyAttendance(
  id: string,
  payload: DailyAttendancePayload,
  userId: string,
  scope?: { accessibleLocationIds?: string[] | null },
) {
  const existingRows = await sql<Array<{ id: string; sourceType: string; approvalStatus: string; employeeId: string; attendanceDate: string; isArchived: boolean }>>`
    SELECT id, "sourceType"::text AS "sourceType", "approvalStatus"::text AS "approvalStatus", "employeeId", "attendanceDate"::date::text AS "attendanceDate", "isArchived"
    FROM "DailyAttendance"
    WHERE id = ${id}
      AND "isArchived" = false
    LIMIT 1
  `;

  const existing = existingRows[0];
  if (!existing) {
    throw new Error("Attendance record not found.");
  }
  if (existing.sourceType === "SHIFT") {
    throw new Error("Shift-synced attendance should be edited from the shift session.");
  }
  if (existing.approvalStatus === "APPROVED") {
    throw new Error("Approved attendance cannot be edited unless it is first rejected or reset.");
  }

  const resolved = await assertAttendanceScope(payload, scope);
  const normalizedDate = new Date(payload.attendanceDate);
  if (Number.isNaN(normalizedDate.getTime())) {
    throw new Error("Invalid attendance date supplied.");
  }

  const conflictRows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "DailyAttendance"
    WHERE "employeeId" = ${resolved.employeeId}
      AND "attendanceDate" = ${normalizedDate}
      AND id <> ${id}
      AND "isArchived" = false
    LIMIT 1
  `;
  if (conflictRows[0]) {
    throw new Error("Another active attendance record already exists for this employee and date.");
  }

  await sql`
    UPDATE "DailyAttendance"
    SET
      "employeeId" = ${resolved.employeeId},
      "attendanceDate" = ${normalizedDate},
      "locationId" = ${resolved.locationId},
      "userId" = ${resolved.userId},
      status = ${normalizeAttendanceStatus(payload.status)}::"DailyAttendanceStatus",
      "approvalStatus" = 'DRAFT'::"AttendanceApprovalStatus",
      "approvedById" = NULL,
      "approvedAt" = NULL,
      "hoursWorked" = ${Math.max(0, Number(payload.hoursWorked ?? 0))},
      "overtimeHours" = ${Math.max(0, Number(payload.overtimeHours ?? 0))},
      remarks = ${normalizeNullableString(payload.remarks)},
      "updatedById" = ${userId},
      "updatedAt" = NOW()
    WHERE id = ${id}
      AND "isArchived" = false
  `;

  return id;
}

export async function archiveDailyAttendance(id: string, scope?: { accessibleLocationIds?: string[] | null }) {
  const rows = await sql<Array<{ id: string; sourceType: string; approvalStatus: string; locationId: string | null }>>`
    SELECT id, "sourceType"::text AS "sourceType", "approvalStatus"::text AS "approvalStatus", "locationId"
    FROM "DailyAttendance"
    WHERE id = ${id}
      AND "isArchived" = false
    LIMIT 1
  `;

  const current = rows[0];
  if (!current) {
    throw new Error("Attendance record not found.");
  }
  if (current.sourceType === "SHIFT") {
    throw new Error("Shift-synced attendance cannot be deleted from HR attendance.");
  }
  if (current.approvalStatus === "APPROVED") {
    throw new Error("Approved attendance cannot be archived.");
  }

  const accessibleLocationIds = (scope?.accessibleLocationIds ?? []).filter(Boolean);
  if (scope?.accessibleLocationIds && accessibleLocationIds.length > 0 && current.locationId && !accessibleLocationIds.includes(current.locationId)) {
    throw new Error("You do not have access to this attendance record.");
  }

  await sql`
    UPDATE "DailyAttendance"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE id = ${id}
  `;
}

export async function syncShiftAttendanceToDailyLedgerTx(tx: Tx, shiftSessionId: string) {
  const shiftRows = await tx<Array<{
    employeeId: string | null;
    userId: string | null;
    locationId: string;
    attendanceDate: string;
    shiftCode: string;
    present: boolean;
    remarks: string | null;
    startedById: string | null;
  }>>`
    SELECT
      e.id AS "employeeId",
      sa."userId",
      ss."locationId",
      ss."productionDate"::date::text AS "attendanceDate",
      ss."shiftCode",
      sa.present,
      sa.remarks,
      ss."startedById"
    FROM "ShiftAttendance" sa
    INNER JOIN "ShiftSession" ss ON ss.id = sa."shiftSessionId"
    LEFT JOIN "Employee" e ON e."userId" = sa."userId" AND e."isArchived" = false
    WHERE sa."shiftSessionId" = ${shiftSessionId}
  `;

  await tx`
    DELETE FROM "DailyAttendance"
    WHERE "shiftSessionId" = ${shiftSessionId}
      AND "sourceType" = 'SHIFT'
  `;

  for (const row of shiftRows) {
    if (!row.employeeId) {
      continue;
    }

    await tx`
      INSERT INTO "DailyAttendance" (
        id,
        "employeeId",
        "attendanceDate",
        "locationId",
        "userId",
        "shiftSessionId",
        "shiftCode",
        status,
        "approvalStatus",
        "approvedById",
        "approvedAt",
        "sourceType",
        "hoursWorked",
        "overtimeHours",
        remarks,
        "isArchived",
        "createdById",
        "updatedById",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${row.employeeId},
        ${new Date(row.attendanceDate)},
        ${row.locationId},
        ${row.userId},
        ${shiftSessionId},
        ${row.shiftCode},
        ${row.present ? "PRESENT" : "ABSENT"}::"DailyAttendanceStatus",
        'APPROVED'::"AttendanceApprovalStatus",
        ${row.startedById},
        NOW(),
        'SHIFT'::"AttendanceSourceType",
        ${row.present ? 1 : 0},
        0,
        ${normalizeNullableString(row.remarks)},
        false,
        ${row.startedById},
        ${row.startedById},
        NOW(),
        NOW()
      )
      ON CONFLICT ("employeeId", "attendanceDate", "isArchived") DO UPDATE SET
        "locationId" = EXCLUDED."locationId",
        "userId" = EXCLUDED."userId",
        "shiftSessionId" = EXCLUDED."shiftSessionId",
        "shiftCode" = EXCLUDED."shiftCode",
        status = EXCLUDED.status,
        "approvalStatus" = 'APPROVED'::"AttendanceApprovalStatus",
        "approvedById" = EXCLUDED."approvedById",
        "approvedAt" = EXCLUDED."approvedAt",
        "sourceType" = 'SHIFT'::"AttendanceSourceType",
        "hoursWorked" = EXCLUDED."hoursWorked",
        "overtimeHours" = EXCLUDED."overtimeHours",
        remarks = EXCLUDED.remarks,
        "updatedById" = EXCLUDED."updatedById",
        "updatedAt" = NOW()
    `;
  }
}

export async function syncShiftAttendanceToDailyLedger(shiftSessionId: string) {
  await sql.begin(async (tx) => {
    await syncShiftAttendanceToDailyLedgerTx(tx, shiftSessionId);
  });
}

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";

export interface LeaveTypeRecord {
  id: string;
  code: string;
  name: string;
  paid: boolean;
  entitlementDays: number;
  requiresAttachment: boolean;
  approvalLevel: number;
  isActive: boolean;
}

export interface LeaveTypePayload {
  code: string;
  name: string;
  paid: boolean;
  entitlementDays: number;
  requiresAttachment: boolean;
  approvalLevel: number;
  isActive: boolean;
}

export interface LeaveRequestRecord {
  id: string;
  publicId: number;
  leaveNo: string;
  employeeId: string;
  employeeNo?: string | null;
  employeeName: string;
  leaveTypeId: string;
  leaveTypeName: string;
  departmentId?: string | null;
  departmentName?: string | null;
  locationId?: string | null;
  locationName?: string | null;
  startDate: string;
  endDate: string;
  days: number;
  reason?: string | null;
  attachmentUrl?: string | null;
  status: string;
  managerApprovalStatus?: string | null;
  hrApprovalStatus?: string | null;
  finalApprovalStatus?: string | null;
  requestedById?: string | null;
  requestedByName?: string | null;
  managerApprovedById?: string | null;
  managerApprovedByName?: string | null;
  managerApprovedAt?: string | null;
  hrApprovedById?: string | null;
  hrApprovedByName?: string | null;
  hrApprovedAt?: string | null;
  finalApprovedById?: string | null;
  finalApprovedByName?: string | null;
  finalApprovedAt?: string | null;
  rejectionReason?: string | null;
  remarks?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LeaveRequestPayload {
  employeeId: string;
  leaveTypeId: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  attachmentUrl?: string | null;
  remarks?: string | null;
}

function normalizeNullableString(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function mapLeaveRequest(row: Record<string, unknown>): LeaveRequestRecord {
  return {
    id: String(row.id),
    publicId: Number(row.publicId ?? 0),
    leaveNo: String(row.leaveNo),
    employeeId: String(row.employeeId),
    employeeNo: row.employeeNo ? String(row.employeeNo) : null,
    employeeName: String(row.employeeName),
    leaveTypeId: String(row.leaveTypeId),
    leaveTypeName: String(row.leaveTypeName),
    departmentId: row.departmentId ? String(row.departmentId) : null,
    departmentName: row.departmentName ? String(row.departmentName) : null,
    locationId: row.locationId ? String(row.locationId) : null,
    locationName: row.locationName ? String(row.locationName) : null,
    startDate: String(row.startDate),
    endDate: String(row.endDate),
    days: Number(row.days ?? 0),
    reason: row.reason ? String(row.reason) : null,
    attachmentUrl: row.attachmentUrl ? String(row.attachmentUrl) : null,
    status: String(row.status),
    managerApprovalStatus: row.managerApprovalStatus ? String(row.managerApprovalStatus) : null,
    hrApprovalStatus: row.hrApprovalStatus ? String(row.hrApprovalStatus) : null,
    finalApprovalStatus: row.finalApprovalStatus ? String(row.finalApprovalStatus) : null,
    requestedById: row.requestedById ? String(row.requestedById) : null,
    requestedByName: row.requestedByName ? String(row.requestedByName) : null,
    managerApprovedById: row.managerApprovedById ? String(row.managerApprovedById) : null,
    managerApprovedByName: row.managerApprovedByName ? String(row.managerApprovedByName) : null,
    managerApprovedAt: row.managerApprovedAt ? String(row.managerApprovedAt) : null,
    hrApprovedById: row.hrApprovedById ? String(row.hrApprovedById) : null,
    hrApprovedByName: row.hrApprovedByName ? String(row.hrApprovedByName) : null,
    hrApprovedAt: row.hrApprovedAt ? String(row.hrApprovedAt) : null,
    finalApprovedById: row.finalApprovedById ? String(row.finalApprovedById) : null,
    finalApprovedByName: row.finalApprovedByName ? String(row.finalApprovedByName) : null,
    finalApprovedAt: row.finalApprovedAt ? String(row.finalApprovedAt) : null,
    rejectionReason: row.rejectionReason ? String(row.rejectionReason) : null,
    remarks: row.remarks ? String(row.remarks) : null,
    createdAt: String(row.createdAt),
    updatedAt: String(row.updatedAt),
  };
}

export async function listLeaveTypes() {
  return sql<Array<LeaveTypeRecord>>`
    SELECT
      id,
      code,
      name,
      paid,
      "entitlementDays",
      "requiresAttachment",
      "approvalLevel",
      "isActive"
    FROM "LeaveType"
    WHERE "isArchived" = false
    ORDER BY name ASC
  `;
}

export async function createLeaveType(payload: LeaveTypePayload) {
  const code = String(payload.code ?? "").trim().toUpperCase();
  const name = String(payload.name ?? "").trim();
  if (!code || !name) {
    throw new Error("Leave type code and name are required.");
  }

  const duplicate = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "LeaveType"
    WHERE UPPER(code) = ${code}
      AND "isArchived" = false
    LIMIT 1
  `;
  if (duplicate[0]) {
    throw new Error("A leave type with this code already exists.");
  }

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO "LeaveType" (
      code,
      name,
      paid,
      "entitlementDays",
      "requiresAttachment",
      "approvalLevel",
      "isActive",
      "isArchived",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${code},
      ${name},
      ${Boolean(payload.paid)},
      ${Number(payload.entitlementDays ?? 0)},
      ${Boolean(payload.requiresAttachment)},
      ${Number(payload.approvalLevel ?? 1)},
      ${Boolean(payload.isActive)},
      false,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0]?.id ?? null;
}

export async function updateLeaveType(id: string, payload: LeaveTypePayload) {
  const code = String(payload.code ?? "").trim().toUpperCase();
  const name = String(payload.name ?? "").trim();
  if (!code || !name) {
    throw new Error("Leave type code and name are required.");
  }

  const duplicate = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "LeaveType"
    WHERE UPPER(code) = ${code}
      AND id <> ${id}
      AND "isArchived" = false
    LIMIT 1
  `;
  if (duplicate[0]) {
    throw new Error("A leave type with this code already exists.");
  }

  await sql`
    UPDATE "LeaveType"
    SET
      code = ${code},
      name = ${name},
      paid = ${Boolean(payload.paid)},
      "entitlementDays" = ${Number(payload.entitlementDays ?? 0)},
      "requiresAttachment" = ${Boolean(payload.requiresAttachment)},
      "approvalLevel" = ${Number(payload.approvalLevel ?? 1)},
      "isActive" = ${Boolean(payload.isActive)},
      "updatedAt" = NOW()
    WHERE id = ${id}
      AND "isArchived" = false
  `;
}

export async function archiveLeaveType(id: string) {
  await sql`
    UPDATE "LeaveType"
    SET
      "isArchived" = true,
      "isActive" = false,
      "updatedAt" = NOW()
    WHERE id = ${id}
  `;
}

export async function listLeaveRequests(scope?: { accessibleLocationIds?: string[] | null }) {
  const locationIds = scope?.accessibleLocationIds?.filter(Boolean) ?? [];
  const locationScope = locationIds.length ? sql`AND (lr."locationId" IS NULL OR lr."locationId" IN ${sql(locationIds)})` : sql``;

  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT
      lr.id,
      lr."publicId",
      lr."leaveNo",
      lr."employeeId",
      e."employeeNo",
      CONCAT_WS(' ', e."firstName", e."middleName", e."lastName") AS "employeeName",
      lr."leaveTypeId",
      lt.name AS "leaveTypeName",
      lr."departmentId",
      d.name AS "departmentName",
      lr."locationId",
      l."locationName",
      lr."startDate"::text AS "startDate",
      lr."endDate"::text AS "endDate",
      lr.days,
      lr.reason,
      lr."attachmentUrl",
      lr.status::text AS status,
      lr."managerApprovalStatus",
      lr."hrApprovalStatus",
      lr."finalApprovalStatus",
      lr."requestedById",
      ru.name AS "requestedByName",
      lr."managerApprovedById",
      mu.name AS "managerApprovedByName",
      lr."managerApprovedAt"::text AS "managerApprovedAt",
      lr."hrApprovedById",
      hu.name AS "hrApprovedByName",
      lr."hrApprovedAt"::text AS "hrApprovedAt",
      lr."finalApprovedById",
      fu.name AS "finalApprovedByName",
      lr."finalApprovedAt"::text AS "finalApprovedAt",
      lr."rejectionReason",
      lr.remarks,
      lr."createdAt"::text AS "createdAt",
      lr."updatedAt"::text AS "updatedAt"
    FROM "LeaveRequest" lr
    INNER JOIN "Employee" e ON e.id = lr."employeeId"
    INNER JOIN "LeaveType" lt ON lt.id = lr."leaveTypeId"
    LEFT JOIN "Department" d ON d.id = lr."departmentId"
    LEFT JOIN "Location" l ON l.id = lr."locationId"
    LEFT JOIN "User" ru ON ru.id = lr."requestedById"
    LEFT JOIN "User" mu ON mu.id = lr."managerApprovedById"
    LEFT JOIN "User" hu ON hu.id = lr."hrApprovedById"
    LEFT JOIN "User" fu ON fu.id = lr."finalApprovedById"
    WHERE lr."isArchived" = false
    ${locationScope}
    ORDER BY lr."createdAt" DESC
  `;

  return rows.map(mapLeaveRequest);
}

export async function getLeaveRequestById(key: string) {
  const rows = await sql<Array<Record<string, unknown>>>`
    SELECT
      lr.id,
      lr."publicId",
      lr."leaveNo",
      lr."employeeId",
      e."employeeNo",
      CONCAT_WS(' ', e."firstName", e."middleName", e."lastName") AS "employeeName",
      lr."leaveTypeId",
      lt.name AS "leaveTypeName",
      lr."departmentId",
      d.name AS "departmentName",
      lr."locationId",
      l."locationName",
      lr."startDate"::text AS "startDate",
      lr."endDate"::text AS "endDate",
      lr.days,
      lr.reason,
      lr."attachmentUrl",
      lr.status::text AS status,
      lr."managerApprovalStatus",
      lr."hrApprovalStatus",
      lr."finalApprovalStatus",
      lr."requestedById",
      ru.name AS "requestedByName",
      lr."managerApprovedById",
      mu.name AS "managerApprovedByName",
      lr."managerApprovedAt"::text AS "managerApprovedAt",
      lr."hrApprovedById",
      hu.name AS "hrApprovedByName",
      lr."hrApprovedAt"::text AS "hrApprovedAt",
      lr."finalApprovedById",
      fu.name AS "finalApprovedByName",
      lr."finalApprovedAt"::text AS "finalApprovedAt",
      lr."rejectionReason",
      lr.remarks,
      lr."createdAt"::text AS "createdAt",
      lr."updatedAt"::text AS "updatedAt"
    FROM "LeaveRequest" lr
    INNER JOIN "Employee" e ON e.id = lr."employeeId"
    INNER JOIN "LeaveType" lt ON lt.id = lr."leaveTypeId"
    LEFT JOIN "Department" d ON d.id = lr."departmentId"
    LEFT JOIN "Location" l ON l.id = lr."locationId"
    LEFT JOIN "User" ru ON ru.id = lr."requestedById"
    LEFT JOIN "User" mu ON mu.id = lr."managerApprovedById"
    LEFT JOIN "User" hu ON hu.id = lr."hrApprovedById"
    LEFT JOIN "User" fu ON fu.id = lr."finalApprovedById"
    WHERE ${isPublicIdParam(key) ? sql`lr."publicId" = ${Number(key)}` : sql`lr.id = ${key}`}
      AND lr."isArchived" = false
    LIMIT 1
  `;

  return rows[0] ? mapLeaveRequest(rows[0]) : null;
}

function calculateDays(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error("Leave start and end dates are required.");
  }
  if (end < start) {
    throw new Error("Leave end date cannot be before the start date.");
  }
  const diff = end.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24)) + 1;
}

export async function getNextLeaveNumber() {
  const rows = await sql<Array<{ leaveNo: string }>>`
    SELECT "leaveNo"
    FROM "LeaveRequest"
    WHERE "leaveNo" LIKE 'LEV-%'
    ORDER BY "createdAt" DESC
    LIMIT 250
  `;

  let max = 0;
  for (const row of rows) {
    const match = row.leaveNo.match(/LEV-(\d+)/i);
    if (!match) continue;
    max = Math.max(max, Number(match[1]));
  }

  return `LEV-${String(max + 1).padStart(4, "0")}`;
}

async function validatePayload(payload: LeaveRequestPayload) {
  const [employeeRows, leaveTypeRows] = await Promise.all([
    sql<Array<{ id: string; departmentId: string | null; locationId: string | null }>>`
      SELECT id, "departmentId", "locationId"
      FROM "Employee"
      WHERE id = ${payload.employeeId}
        AND "isArchived" = false
        AND "isActive" = true
      LIMIT 1
    `,
    sql<Array<{ id: string; requiresAttachment: boolean }>>`
      SELECT id, "requiresAttachment"
      FROM "LeaveType"
      WHERE id = ${payload.leaveTypeId}
        AND "isArchived" = false
        AND "isActive" = true
      LIMIT 1
    `,
  ]);

  const employee = employeeRows[0];
  const leaveType = leaveTypeRows[0];

  if (!employee) {
    throw new Error("Selected employee was not found.");
  }
  if (!leaveType) {
    throw new Error("Selected leave type was not found.");
  }
  if (leaveType.requiresAttachment && !normalizeNullableString(payload.attachmentUrl)) {
    throw new Error("This leave type requires an attachment.");
  }

  return { employee, leaveType };
}

export async function createLeaveRequest(payload: LeaveRequestPayload, currentUserId: string) {
  const { employee } = await validatePayload(payload);
  const leaveNo = await getNextLeaveNumber();
  const days = calculateDays(payload.startDate, payload.endDate);

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO "LeaveRequest" (
      "leaveNo",
      "employeeId",
      "leaveTypeId",
      "departmentId",
      "locationId",
      "startDate",
      "endDate",
      days,
      reason,
      "attachmentUrl",
      status,
      "managerApprovalStatus",
      "hrApprovalStatus",
      "finalApprovalStatus",
      "requestedById",
      remarks,
      "isArchived",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${leaveNo},
      ${payload.employeeId},
      ${payload.leaveTypeId},
      ${employee.departmentId},
      ${employee.locationId},
      ${new Date(payload.startDate)},
      ${new Date(payload.endDate)},
      ${days},
      ${normalizeNullableString(payload.reason)},
      ${normalizeNullableString(payload.attachmentUrl)},
      'DRAFT',
      'PENDING',
      'PENDING',
      'PENDING',
      ${currentUserId},
      ${normalizeNullableString(payload.remarks)},
      false,
      NOW(),
      NOW()
    )
    RETURNING id
  `;

  return rows[0]?.id ?? null;
}

export async function updateLeaveRequest(id: string, payload: LeaveRequestPayload) {
  const existing = await getLeaveRequestById(id);
  if (!existing) {
    throw new Error("Leave request not found.");
  }
  if (!["DRAFT", "SUBMITTED"].includes(existing.status)) {
    throw new Error("Only draft or submitted leave requests can be edited.");
  }

  const { employee } = await validatePayload(payload);
  const days = calculateDays(payload.startDate, payload.endDate);

  await sql`
    UPDATE "LeaveRequest"
    SET
      "employeeId" = ${payload.employeeId},
      "leaveTypeId" = ${payload.leaveTypeId},
      "departmentId" = ${employee.departmentId},
      "locationId" = ${employee.locationId},
      "startDate" = ${new Date(payload.startDate)},
      "endDate" = ${new Date(payload.endDate)},
      days = ${days},
      reason = ${normalizeNullableString(payload.reason)},
      "attachmentUrl" = ${normalizeNullableString(payload.attachmentUrl)},
      remarks = ${normalizeNullableString(payload.remarks)},
      "updatedAt" = NOW()
    WHERE id = ${id}
      AND "isArchived" = false
  `;

  return id;
}

export async function changeLeaveRequestStatus(input: {
  id: string;
  action: "submit" | "approve" | "reject" | "cancel";
  userId: string;
  rejectionReason?: string | null;
}) {
  const existing = await getLeaveRequestById(input.id);
  if (!existing) {
    throw new Error("Leave request not found.");
  }

  if (input.action === "submit") {
    if (existing.status !== "DRAFT") {
      throw new Error("Only draft leave requests can be submitted.");
    }
    await sql`
      UPDATE "LeaveRequest"
      SET status = 'SUBMITTED', "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    return;
  }

  if (input.action === "cancel") {
    if (!["DRAFT", "SUBMITTED"].includes(existing.status)) {
      throw new Error("Only draft or submitted leave requests can be cancelled.");
    }
    await sql`
      UPDATE "LeaveRequest"
      SET
        status = 'CANCELLED',
        "rejectionReason" = ${normalizeNullableString(input.rejectionReason)},
        "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    return;
  }

  if (input.action === "reject") {
    if (!["SUBMITTED", "DRAFT"].includes(existing.status)) {
      throw new Error("Only open leave requests can be rejected.");
    }
    await sql`
      UPDATE "LeaveRequest"
      SET
        status = 'REJECTED',
        "managerApprovalStatus" = 'REJECTED',
        "hrApprovalStatus" = 'REJECTED',
        "finalApprovalStatus" = 'REJECTED',
        "rejectionReason" = ${normalizeNullableString(input.rejectionReason)},
        "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    return;
  }

  if (existing.status !== "SUBMITTED") {
    throw new Error("Only submitted leave requests can be approved.");
  }

  await sql`
    UPDATE "LeaveRequest"
    SET
      status = 'APPROVED',
      "managerApprovalStatus" = 'APPROVED',
      "hrApprovalStatus" = 'APPROVED',
      "finalApprovalStatus" = 'APPROVED',
      "managerApprovedById" = COALESCE("managerApprovedById", ${input.userId}),
      "managerApprovedAt" = COALESCE("managerApprovedAt", NOW()),
      "hrApprovedById" = COALESCE("hrApprovedById", ${input.userId}),
      "hrApprovedAt" = COALESCE("hrApprovedAt", NOW()),
      "finalApprovedById" = ${input.userId},
      "finalApprovedAt" = NOW(),
      "updatedAt" = NOW()
    WHERE id = ${input.id}
  `;
}

export async function getLeaveReferenceData() {
  const [employees, leaveTypes] = await Promise.all([
    sql<Array<{ value: string; label: string }>>`
      SELECT
        e.id AS value,
        CONCAT(e."employeeNo", ' - ', CONCAT_WS(' ', e."firstName", e."middleName", e."lastName")) AS label
      FROM "Employee" e
      WHERE e."isArchived" = false
        AND e."isActive" = true
      ORDER BY e."employeeNo" ASC
    `,
    sql<Array<{ value: string; label: string }>>`
      SELECT id AS value, CONCAT(code, ' - ', name) AS label
      FROM "LeaveType"
      WHERE "isArchived" = false
        AND "isActive" = true
      ORDER BY name ASC
    `,
  ]);

  return { employees, leaveTypes };
}

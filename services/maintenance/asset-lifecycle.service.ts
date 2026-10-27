import { randomUUID } from "node:crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import type { Tx } from "@/services/procurement/procurement-shared.service";

export type AssetCategoryRecord = {
  id: string;
  code: string;
  name: string;
  assetTypeId: string | null;
  assetTypeName: string | null;
  description: string | null;
  isActive: boolean;
};

export type AssetAssignmentRecord = {
  id: string;
  publicId: number;
  assignmentNo: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  assignedToType: string;
  assignedToUserId: string | null;
  assignedToDepartmentId: string | null;
  assignedToLocationId: string | null;
  assigneeName: string;
  assignedDate: string;
  expectedReturnDate: string | null;
  returnedDate: string | null;
  conditionAtIssue: string;
  conditionAtReturn: string | null;
  status: string;
  remarks: string | null;
};

export type AssetTransferRecord = {
  id: string;
  publicId: number;
  transferNo: string;
  assetId: string;
  assetCode: string;
  assetName: string;
  fromLocationId: string;
  fromLocationName: string;
  toLocationId: string;
  toLocationName: string;
  transferDate: string;
  reason: string;
  status: string;
  remarks: string | null;
  postedAt: string | null;
};

export type AssetHistoryRecord = {
  id: string;
  assetId: string;
  eventType: string;
  referenceType: string | null;
  referenceId: string | null;
  eventDate: string;
  oldStatus: string | null;
  newStatus: string | null;
  oldLocationName: string | null;
  newLocationName: string | null;
  performedByName: string | null;
  remarks: string | null;
};

function required(value: unknown, label: string) {
  const result = String(value ?? "").trim();
  if (!result) throw new Error(`${label} is required`);
  return result;
}

function optional(value: unknown) {
  const result = String(value ?? "").trim();
  return result || null;
}

function code(value: unknown) {
  return required(value, "Code").toUpperCase().replace(/\s+/g, "-");
}

async function nextNumber(tx: Tx, table: "AssetAssignment" | "AssetTransfer", column: "assignmentNo" | "transferNo", prefix: string) {
  const year = new Date().getFullYear();
  const pattern = `${prefix}-${year}-%`;
  const rows = table === "AssetAssignment"
    ? await tx<Array<{ value: number }>>`
        SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE("assignmentNo", '^.*-', ''), '')::integer), 0) + 1 AS value
        FROM "AssetAssignment" WHERE "assignmentNo" LIKE ${pattern}
      `
    : await tx<Array<{ value: number }>>`
        SELECT COALESCE(MAX(NULLIF(REGEXP_REPLACE("transferNo", '^.*-', ''), '')::integer), 0) + 1 AS value
        FROM "AssetTransfer" WHERE "transferNo" LIKE ${pattern}
      `;
  void column;
  return `${prefix}-${year}-${String(Number(rows[0]?.value ?? 1)).padStart(4, "0")}`;
}

async function writeHistory(tx: Tx, input: {
  assetId: string;
  eventType: string;
  referenceType?: string;
  referenceId?: string;
  oldStatus?: string | null;
  newStatus?: string | null;
  oldLocationId?: string | null;
  newLocationId?: string | null;
  performedById: string;
  remarks?: string | null;
}) {
  await tx`
    INSERT INTO "AssetHistory" (
      id, "assetId", "eventType", "referenceType", "referenceId", "eventDate", "oldStatus", "newStatus",
      "oldLocationId", "newLocationId", "performedById", remarks, "createdAt"
    ) VALUES (
      ${randomUUID()}, ${input.assetId}, ${input.eventType}, ${input.referenceType ?? null}, ${input.referenceId ?? null}, NOW(),
      ${input.oldStatus ?? null}, ${input.newStatus ?? null}, ${input.oldLocationId ?? null}, ${input.newLocationId ?? null},
      ${input.performedById}, ${input.remarks ?? null}, NOW()
    )
  `;
  const snapshot = JSON.stringify(input);
  await tx`
    INSERT INTO "AuditLog" (id, "userId", action, module, "recordId", "newValue", timestamp, "isArchived")
    VALUES (${randomUUID()}, ${input.performedById}, ${input.eventType}, 'maintenance.assets', ${input.assetId}, ${snapshot}, NOW(), false)
  `;
  if (input.referenceType && input.referenceId) {
    await tx`
      INSERT INTO "DocumentHistory" (id, "referenceType", "referenceId", action, "newValue", "performedById", "createdAt", "isArchived")
      VALUES (${randomUUID()}, ${input.referenceType}, ${input.referenceId}, ${input.eventType}, ${snapshot}, ${input.performedById}, NOW(), false)
    `;
  }
}

export async function listAssetCategories(): Promise<AssetCategoryRecord[]> {
  return sql<AssetCategoryRecord[]>`
    SELECT ac.id, ac.code, ac.name, ac."assetTypeId", at.name AS "assetTypeName", ac.description, ac."isActive"
    FROM "AssetCategory" ac
    LEFT JOIN "AssetType" at ON at.id = ac."assetTypeId"
    WHERE ac."isArchived" = false
    ORDER BY ac.code, ac.name
  `;
}

export async function createAssetType(input: { code: string; name: string; description?: string; isActive?: boolean; createdById: string }) {
  const id = randomUUID();
  const typeCode = code(input.code);
  await sql.begin(async (tx) => {
    await tx`INSERT INTO "AssetType" (id, code, name, description, "isActive", "isArchived", "createdAt", "updatedAt") VALUES (${id}, ${typeCode}, ${required(input.name, "Type name")}, ${optional(input.description)}, ${input.isActive !== false}, false, NOW(), NOW())`;
    const snapshot = JSON.stringify({ code: typeCode, name: input.name });
    await tx`INSERT INTO "AuditLog" (id, "userId", action, module, "recordId", "newValue", timestamp, "isArchived") VALUES (${randomUUID()}, ${input.createdById}, 'CREATE_ASSET_TYPE', 'maintenance.asset-master', ${id}, ${snapshot}, NOW(), false)`;
  });
  return { id, code: typeCode, name: input.name };
}

export async function createAssetCategory(input: { code: string; name: string; assetTypeId?: string; description?: string; isActive?: boolean; createdById: string }) {
  const id = randomUUID();
  const categoryCode = code(input.code);
  await sql.begin(async (tx) => {
    await tx`
      INSERT INTO "AssetCategory" (id, code, name, "assetTypeId", description, "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${id}, ${categoryCode}, ${required(input.name, "Category name")}, ${optional(input.assetTypeId)}, ${optional(input.description)}, ${input.isActive !== false}, false, NOW(), NOW())
    `;
    const snapshot = JSON.stringify({ code: categoryCode, name: input.name, assetTypeId: input.assetTypeId ?? null });
    await tx`INSERT INTO "AuditLog" (id, "userId", action, module, "recordId", "newValue", timestamp, "isArchived") VALUES (${randomUUID()}, ${input.createdById}, 'CREATE_ASSET_CATEGORY', 'maintenance.asset-master', ${id}, ${snapshot}, NOW(), false)`;
  });
  return (await listAssetCategories()).find((item) => item.id === id) ?? null;
}

export async function updateAssetType(input: { id: string; code: string; name: string; description?: string; isActive?: boolean; updatedById: string }) {
  const typeCode = code(input.code);
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; isActive: boolean }>>`SELECT id, "isActive" FROM "AssetType" WHERE id = ${input.id} AND "isArchived" = false LIMIT 1 FOR UPDATE`;
    if (!rows[0]) throw new Error("Asset type not found");
    const duplicate = await tx<Array<{ id: string }>>`SELECT id FROM "AssetType" WHERE code = ${typeCode} AND id <> ${input.id} AND "isArchived" = false LIMIT 1`;
    if (duplicate[0]) throw new Error("Asset type code already exists");
    await tx`UPDATE "AssetType" SET code = ${typeCode}, name = ${required(input.name, "Type name")}, description = ${optional(input.description)}, "isActive" = ${input.isActive !== false}, "updatedAt" = NOW() WHERE id = ${input.id}`;
    const snapshot = JSON.stringify({ code: typeCode, name: input.name, isActive: input.isActive !== false });
    await tx`INSERT INTO "AuditLog" (id, "userId", action, module, "recordId", "newValue", timestamp, "isArchived") VALUES (${randomUUID()}, ${input.updatedById}, 'UPDATE_ASSET_TYPE', 'maintenance.asset-master', ${input.id}, ${snapshot}, NOW(), false)`;
  });
  return { id: input.id, code: typeCode, name: input.name, isActive: input.isActive !== false };
}

export async function updateAssetCategory(input: { id: string; code: string; name: string; assetTypeId?: string; description?: string; isActive?: boolean; updatedById: string }) {
  const categoryCode = code(input.code);
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string }>>`SELECT id FROM "AssetCategory" WHERE id = ${input.id} AND "isArchived" = false LIMIT 1 FOR UPDATE`;
    if (!rows[0]) throw new Error("Asset category not found");
    const duplicate = await tx<Array<{ id: string }>>`SELECT id FROM "AssetCategory" WHERE code = ${categoryCode} AND id <> ${input.id} AND "isArchived" = false LIMIT 1`;
    if (duplicate[0]) throw new Error("Asset category code already exists");
    await tx`UPDATE "AssetCategory" SET code = ${categoryCode}, name = ${required(input.name, "Category name")}, "assetTypeId" = ${optional(input.assetTypeId)}, description = ${optional(input.description)}, "isActive" = ${input.isActive !== false}, "updatedAt" = NOW() WHERE id = ${input.id}`;
    const snapshot = JSON.stringify({ code: categoryCode, name: input.name, assetTypeId: input.assetTypeId ?? null, isActive: input.isActive !== false });
    await tx`INSERT INTO "AuditLog" (id, "userId", action, module, "recordId", "newValue", timestamp, "isArchived") VALUES (${randomUUID()}, ${input.updatedById}, 'UPDATE_ASSET_CATEGORY', 'maintenance.asset-master', ${input.id}, ${snapshot}, NOW(), false)`;
  });
  return (await listAssetCategories()).find((item) => item.id === input.id) ?? null;
}

export async function listAssetAssignments(assetId?: string): Promise<AssetAssignmentRecord[]> {
  return sql<AssetAssignmentRecord[]>`
    SELECT aa.id, aa."publicId", aa."assignmentNo", aa."assetId", a."assetCode", a."assetName", aa."assignedToType"::text AS "assignedToType",
      aa."assignedToUserId", aa."assignedToDepartmentId", aa."assignedToLocationId",
      CASE aa."assignedToType"::text
        WHEN 'USER' THEN COALESCE(u.name, 'Unknown user')
        WHEN 'DEPARTMENT' THEN COALESCE(d.name, 'Unknown department')
        ELSE COALESCE(l."locationName", 'Unknown location')
      END AS "assigneeName",
      aa."assignedDate"::text AS "assignedDate", aa."expectedReturnDate"::text AS "expectedReturnDate",
      aa."returnedDate"::text AS "returnedDate", aa."conditionAtIssue", aa."conditionAtReturn",
      aa.status::text AS status, aa.remarks
    FROM "AssetAssignment" aa
    INNER JOIN "Asset" a ON a.id = aa."assetId"
    LEFT JOIN "User" u ON u.id = aa."assignedToUserId"
    LEFT JOIN "Department" d ON d.id = aa."assignedToDepartmentId"
    LEFT JOIN "Location" l ON l.id = aa."assignedToLocationId"
    WHERE (${assetId ?? null}::text IS NULL OR aa."assetId" = ${assetId ?? null})
    ORDER BY aa."assignedDate" DESC, aa."createdAt" DESC
  `;
}

export async function getAssetAssignmentById(id: string): Promise<AssetAssignmentRecord | null> {
  const rows = await sql<AssetAssignmentRecord[]>`
    SELECT aa.id, aa."publicId", aa."assignmentNo", aa."assetId", a."assetCode", a."assetName", aa."assignedToType"::text AS "assignedToType",
      aa."assignedToUserId", aa."assignedToDepartmentId", aa."assignedToLocationId",
      CASE aa."assignedToType"::text
        WHEN 'USER' THEN COALESCE(u.name, 'Unknown user')
        WHEN 'DEPARTMENT' THEN COALESCE(d.name, 'Unknown department')
        ELSE COALESCE(l."locationName", 'Unknown location')
      END AS "assigneeName",
      aa."assignedDate"::text AS "assignedDate", aa."expectedReturnDate"::text AS "expectedReturnDate",
      aa."returnedDate"::text AS "returnedDate", aa."conditionAtIssue", aa."conditionAtReturn",
      aa.status::text AS status, aa.remarks
    FROM "AssetAssignment" aa
    INNER JOIN "Asset" a ON a.id = aa."assetId"
    LEFT JOIN "User" u ON u.id = aa."assignedToUserId"
    LEFT JOIN "Department" d ON d.id = aa."assignedToDepartmentId"
    LEFT JOIN "Location" l ON l.id = aa."assignedToLocationId"
    WHERE ${isPublicIdParam(id) ? sql`aa."publicId" = ${Number(id)}` : sql`aa.id = ${id}`}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createAssetAssignment(input: {
  assetId: string;
  assignedToType: string;
  assignedToUserId?: string;
  assignedToDepartmentId?: string;
  assignedToLocationId?: string;
  assignedDate: string;
  expectedReturnDate?: string;
  conditionAtIssue: string;
  remarks?: string;
  assignedById: string;
}) {
  const assetId = required(input.assetId, "Asset");
  const { target, targetId: normalizedTargetId } = assignmentTarget(input);
  let id = "";
  await sql.begin(async (tx) => {
    const assets = await tx<Array<{ id: string; status: string }>>`SELECT id, status::text AS status FROM "Asset" WHERE id = ${assetId} AND "isArchived" = false LIMIT 1 FOR UPDATE`;
    const asset = assets[0];
    if (!asset) throw new Error("Asset not found");
    if (["IN_TRANSIT", "DISPOSED", "RETIRED"].includes(asset.status)) throw new Error(`Asset cannot be assigned while ${asset.status.toLowerCase().replace(/_/g, " ")}`);
    const active = await tx<Array<{ count: number }>>`SELECT COUNT(*)::int AS count FROM "AssetAssignment" WHERE "assetId" = ${assetId} AND status IN ('DRAFT', 'SUBMITTED', 'CHECKED', 'APPROVED', 'ACTIVE')`;
    if (Number(active[0]?.count ?? 0) > 0) throw new Error("Asset already has an active assignment; return it before creating another assignment");
    id = randomUUID();
    const assignmentNo = await nextNumber(tx, "AssetAssignment", "assignmentNo", "AAS");
    await tx`
      INSERT INTO "AssetAssignment" (
        id, "assignmentNo", "assetId", "assignedToType", "assignedToUserId", "assignedToDepartmentId", "assignedToLocationId",
        "assignedDate", "expectedReturnDate", "conditionAtIssue", status, remarks, "assignedById", "createdAt", "updatedAt"
      ) VALUES (
        ${id}, ${assignmentNo}, ${assetId}, ${target}, ${target === "USER" ? normalizedTargetId : null},
        ${target === "DEPARTMENT" ? normalizedTargetId : null}, ${target === "LOCATION" ? normalizedTargetId : null}, ${new Date(input.assignedDate)},
        ${input.expectedReturnDate ? new Date(input.expectedReturnDate) : null}, ${required(input.conditionAtIssue, "Condition at issue")},
        'DRAFT', ${optional(input.remarks)}, ${input.assignedById}, NOW(), NOW()
      )
    `;
    await writeHistory(tx, { assetId, eventType: "ASSET_ASSIGNMENT_CREATED", referenceType: "asset-assignment", referenceId: id, oldStatus: asset.status, newStatus: asset.status, performedById: input.assignedById, remarks: optional(input.remarks) });
  });
  return (await listAssetAssignments(assetId)).find((item) => item.id === id) ?? null;
}

function assignmentTarget(input: {
  assignedToType: string;
  assignedToUserId?: string;
  assignedToDepartmentId?: string;
  assignedToLocationId?: string;
}) {
  const target = required(input.assignedToType, "Assignment target").toUpperCase();
  if (!["USER", "DEPARTMENT", "LOCATION"].includes(target)) throw new Error("Invalid assignment target");
  const targetId = target === "USER" ? input.assignedToUserId : target === "DEPARTMENT" ? input.assignedToDepartmentId : input.assignedToLocationId;
  return { target, targetId: required(targetId, `${target.toLowerCase()} selection`) };
}

export async function updateAssetAssignment(input: {
  id: string;
  assignedToType: string;
  assignedToUserId?: string;
  assignedToDepartmentId?: string;
  assignedToLocationId?: string;
  assignedDate: string;
  expectedReturnDate?: string;
  conditionAtIssue: string;
  remarks?: string;
  updatedById: string;
}) {
  const { target, targetId } = assignmentTarget(input);
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; assetId: string; status: string }>>`SELECT id, "assetId", status::text AS status FROM "AssetAssignment" WHERE id = ${input.id} LIMIT 1 FOR UPDATE`;
    const assignment = rows[0];
    if (!assignment) throw new Error("Asset assignment not found");
    if (assignment.status !== "DRAFT") throw new Error("Only draft assignments can be updated");
    await tx`
      UPDATE "AssetAssignment" SET
        "assignedToType" = ${target},
        "assignedToUserId" = ${target === "USER" ? targetId : null},
        "assignedToDepartmentId" = ${target === "DEPARTMENT" ? targetId : null},
        "assignedToLocationId" = ${target === "LOCATION" ? targetId : null},
        "assignedDate" = ${new Date(input.assignedDate)},
        "expectedReturnDate" = ${input.expectedReturnDate ? new Date(input.expectedReturnDate) : null},
        "conditionAtIssue" = ${required(input.conditionAtIssue, "Condition at issue")},
        remarks = ${optional(input.remarks)},
        "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    await writeHistory(tx, { assetId: assignment.assetId, eventType: "ASSET_ASSIGNMENT_UPDATED", referenceType: "asset-assignment", referenceId: input.id, performedById: input.updatedById, remarks: optional(input.remarks) });
  });
  return getAssetAssignmentById(input.id);
}

export async function transitionAssetAssignment(input: { id: string; action: "submit" | "check" | "approve" | "reject" | "cancel"; performedById: string; remarks?: string }) {
  const transitions: Record<string, { from: string[]; to: string }> = {
    submit: { from: ["DRAFT"], to: "SUBMITTED" }, check: { from: ["SUBMITTED"], to: "CHECKED" },
    approve: { from: ["CHECKED"], to: "ACTIVE" }, reject: { from: ["SUBMITTED", "CHECKED"], to: "REJECTED" },
    cancel: { from: ["DRAFT", "SUBMITTED", "CHECKED"], to: "CANCELLED" },
  };
  const rule = transitions[input.action];
  if (!rule) throw new Error("Unsupported assignment action");
  let assetId = "";
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; assetId: string; status: string; assignedById: string; checkedById: string | null; assignedToType: string; assignedToUserId: string | null; assignedToDepartmentId: string | null }>>`
      SELECT id, "assetId", status::text AS status, "assignedById", "checkedById", "assignedToType"::text AS "assignedToType", "assignedToUserId", "assignedToDepartmentId"
      FROM "AssetAssignment" WHERE id = ${input.id} LIMIT 1 FOR UPDATE`;
    const assignment = rows[0];
    if (!assignment) throw new Error("Asset assignment not found");
    if (!rule.from.includes(assignment.status)) throw new Error(`Cannot ${input.action} an assignment in ${assignment.status} status`);
    if (input.action === "check" && assignment.assignedById === input.performedById) throw new Error("Assignment maker cannot check their own assignment");
    if (input.action === "approve" && (assignment.assignedById === input.performedById || assignment.checkedById === input.performedById)) throw new Error("Assignment approver must be separate from maker and checker");
    assetId = assignment.assetId;
    await tx`UPDATE "AssetAssignment" SET status = ${rule.to},
      "submittedAt" = CASE WHEN ${input.action} = 'submit' THEN NOW() ELSE "submittedAt" END,
      "checkedById" = CASE WHEN ${input.action} = 'check' THEN ${input.performedById} ELSE "checkedById" END,
      "approvedById" = CASE WHEN ${input.action} = 'approve' THEN ${input.performedById} ELSE "approvedById" END,
      "approvedAt" = CASE WHEN ${input.action} = 'approve' THEN NOW() ELSE "approvedAt" END,
      remarks = COALESCE(${optional(input.remarks)}, remarks), "updatedAt" = NOW() WHERE id = ${input.id}`;
    if (input.action === "approve") {
      await tx`UPDATE "Asset" SET status = 'ASSIGNED', "responsibleUserId" = ${assignment.assignedToType === "USER" ? assignment.assignedToUserId : null},
        "departmentId" = COALESCE(${assignment.assignedToType === "DEPARTMENT" ? assignment.assignedToDepartmentId : null}, "departmentId"), "updatedAt" = NOW() WHERE id = ${assignment.assetId}`;
    }
    await writeHistory(tx, { assetId, eventType: `ASSET_ASSIGNMENT_${rule.to}`, referenceType: "asset-assignment", referenceId: input.id,
      newStatus: input.action === "approve" ? "ASSIGNED" : undefined, performedById: input.performedById, remarks: optional(input.remarks) });
  });
  return (await listAssetAssignments(assetId)).find((item) => item.id === input.id) ?? null;
}

export async function returnAssetAssignment(input: { id: string; conditionAtReturn: string; remarks?: string; returnedById: string }) {
  let assetId = "";
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; assetId: string; status: string }>>`SELECT id, "assetId", status::text AS status FROM "AssetAssignment" WHERE id = ${input.id} LIMIT 1 FOR UPDATE`;
    const assignment = rows[0];
    if (!assignment) throw new Error("Asset assignment not found");
    if (assignment.status !== "ACTIVE") throw new Error("Only active assignments can be returned");
    assetId = assignment.assetId;
    await tx`UPDATE "AssetAssignment" SET status = 'RETURNED', "returnedDate" = NOW(), "conditionAtReturn" = ${required(input.conditionAtReturn, "Condition at return")}, "returnedById" = ${input.returnedById}, remarks = COALESCE(${optional(input.remarks)}, remarks), "updatedAt" = NOW() WHERE id = ${input.id}`;
    await tx`UPDATE "Asset" SET status = 'ACTIVE', "responsibleUserId" = NULL, "updatedAt" = NOW() WHERE id = ${assignment.assetId} AND status = 'ASSIGNED'`;
    await writeHistory(tx, { assetId: assignment.assetId, eventType: "ASSET_RETURNED", referenceType: "asset-assignment", referenceId: input.id, oldStatus: "ASSIGNED", newStatus: "ACTIVE", performedById: input.returnedById, remarks: optional(input.remarks) });
  });
  return (await listAssetAssignments(assetId)).find((item) => item.id === input.id) ?? null;
}

export async function listAssetTransfers(assetId?: string): Promise<AssetTransferRecord[]> {
  return sql<AssetTransferRecord[]>`
    SELECT t.id, t."publicId", t."transferNo", t."assetId", a."assetCode", a."assetName", t."fromLocationId",
      fl."locationCode" || ' - ' || fl."locationName" AS "fromLocationName", t."toLocationId",
      tl."locationCode" || ' - ' || tl."locationName" AS "toLocationName", t."transferDate"::text AS "transferDate",
      t.reason, t.status::text AS status, t.remarks, t."postedAt"::text AS "postedAt"
    FROM "AssetTransfer" t
    INNER JOIN "Asset" a ON a.id = t."assetId"
    INNER JOIN "Location" fl ON fl.id = t."fromLocationId"
    INNER JOIN "Location" tl ON tl.id = t."toLocationId"
    WHERE (${assetId ?? null}::text IS NULL OR t."assetId" = ${assetId ?? null})
    ORDER BY t."transferDate" DESC, t."createdAt" DESC
  `;
}

export async function getAssetTransferById(id: string): Promise<AssetTransferRecord | null> {
  const rows = await sql<AssetTransferRecord[]>`
    SELECT t.id, t."publicId", t."transferNo", t."assetId", a."assetCode", a."assetName", t."fromLocationId",
      fl."locationCode" || ' - ' || fl."locationName" AS "fromLocationName", t."toLocationId",
      tl."locationCode" || ' - ' || tl."locationName" AS "toLocationName", t."transferDate"::text AS "transferDate",
      t.reason, t.status::text AS status, t.remarks, t."postedAt"::text AS "postedAt"
    FROM "AssetTransfer" t
    INNER JOIN "Asset" a ON a.id = t."assetId"
    INNER JOIN "Location" fl ON fl.id = t."fromLocationId"
    INNER JOIN "Location" tl ON tl.id = t."toLocationId"
    WHERE ${isPublicIdParam(id) ? sql`t."publicId" = ${Number(id)}` : sql`t.id = ${id}`}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

export async function createAssetTransfer(input: { assetId: string; toLocationId: string; transferDate: string; reason: string; remarks?: string; createdById: string }) {
  const assetId = required(input.assetId, "Asset");
  let id = "";
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; locationId: string; status: string }>>`SELECT id, "locationId", status::text AS status FROM "Asset" WHERE id = ${assetId} AND "isArchived" = false LIMIT 1 FOR UPDATE`;
    const asset = rows[0];
    if (!asset) throw new Error("Asset not found");
    if (asset.locationId === input.toLocationId) throw new Error("Destination must be different from the current asset location");
    if (["UNDER_MAINTENANCE", "DISPOSED", "RETIRED", "IN_TRANSIT"].includes(asset.status)) throw new Error(`Asset cannot be transferred while ${asset.status.toLowerCase().replace(/_/g, " ")}`);
    id = randomUUID();
    const transferNo = await nextNumber(tx, "AssetTransfer", "transferNo", "ATR");
    await tx`
      INSERT INTO "AssetTransfer" (id, "transferNo", "assetId", "fromLocationId", "toLocationId", "transferDate", reason, status, remarks, "createdById", "createdAt", "updatedAt")
      VALUES (${id}, ${transferNo}, ${assetId}, ${asset.locationId}, ${required(input.toLocationId, "Destination location")}, ${new Date(input.transferDate)}, ${required(input.reason, "Transfer reason")}, 'DRAFT', ${optional(input.remarks)}, ${input.createdById}, NOW(), NOW())
    `;
    await writeHistory(tx, { assetId, eventType: "ASSET_TRANSFER_CREATED", referenceType: "asset-transfer", referenceId: id, oldLocationId: asset.locationId, newLocationId: input.toLocationId, performedById: input.createdById, remarks: optional(input.remarks) });
  });
  return (await listAssetTransfers(assetId)).find((item) => item.id === id) ?? null;
}

export async function updateAssetTransfer(input: {
  id: string;
  toLocationId: string;
  transferDate: string;
  reason: string;
  remarks?: string;
  updatedById: string;
}) {
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; assetId: string; status: string; locationId: string }>>`
      SELECT t.id, t."assetId", t.status::text AS status, a."locationId"
      FROM "AssetTransfer" t INNER JOIN "Asset" a ON a.id = t."assetId"
      WHERE t.id = ${input.id} LIMIT 1 FOR UPDATE OF t, a
    `;
    const transfer = rows[0];
    if (!transfer) throw new Error("Asset transfer not found");
    if (transfer.status !== "DRAFT") throw new Error("Only draft transfers can be updated");
    const toLocationId = required(input.toLocationId, "Destination location");
    if (transfer.locationId === toLocationId) throw new Error("Destination must be different from the current asset location");
    await tx`
      UPDATE "AssetTransfer" SET
        "fromLocationId" = ${transfer.locationId},
        "toLocationId" = ${toLocationId},
        "transferDate" = ${new Date(input.transferDate)},
        reason = ${required(input.reason, "Transfer reason")},
        remarks = ${optional(input.remarks)},
        "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    await writeHistory(tx, {
      assetId: transfer.assetId, eventType: "ASSET_TRANSFER_UPDATED", referenceType: "asset-transfer", referenceId: input.id,
      oldLocationId: transfer.locationId, newLocationId: toLocationId, performedById: input.updatedById, remarks: optional(input.remarks),
    });
  });
  return getAssetTransferById(input.id);
}

export async function transitionAssetTransfer(input: { id: string; action: "submit" | "check" | "approve" | "post" | "reject" | "cancel"; performedById: string; remarks?: string }) {
  const transitions: Record<string, { from: string[]; to: string }> = {
    submit: { from: ["DRAFT"], to: "SUBMITTED" },
    check: { from: ["SUBMITTED"], to: "CHECKED" },
    approve: { from: ["CHECKED"], to: "APPROVED" },
    post: { from: ["APPROVED"], to: "POSTED" },
    reject: { from: ["SUBMITTED", "CHECKED"], to: "REJECTED" },
    cancel: { from: ["DRAFT", "SUBMITTED", "CHECKED", "APPROVED"], to: "CANCELLED" },
  };
  const rule = transitions[input.action];
  if (!rule) throw new Error("Unsupported transfer action");
  let assetId = "";
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; assetId: string; fromLocationId: string; toLocationId: string; status: string; assetStatus: string; currentLocationId: string; createdById: string; checkedById: string | null; approvedById: string | null }>>`
      SELECT t.id, t."assetId", t."fromLocationId", t."toLocationId", t.status::text AS status,
        a.status::text AS "assetStatus", a."locationId" AS "currentLocationId", t."createdById", t."checkedById", t."approvedById"
      FROM "AssetTransfer" t INNER JOIN "Asset" a ON a.id = t."assetId"
      WHERE t.id = ${input.id} LIMIT 1 FOR UPDATE OF t, a
    `;
    const transfer = rows[0];
    if (!transfer) throw new Error("Asset transfer not found");
    if (!rule.from.includes(transfer.status)) throw new Error(`Cannot ${input.action} a transfer in ${transfer.status} status`);
    if (input.action === "check" && transfer.createdById === input.performedById) throw new Error("Transfer maker cannot check their own transfer");
    if (input.action === "approve" && (transfer.createdById === input.performedById || transfer.checkedById === input.performedById)) throw new Error("Transfer approver must be separate from maker and checker");
    if (input.action === "post" && transfer.approvedById === input.performedById) throw new Error("Transfer approver cannot post their own approval");
    if (input.action === "post" && transfer.currentLocationId !== transfer.fromLocationId) throw new Error("Asset location changed after this transfer was created; cancel it and create a new transfer");
    assetId = transfer.assetId;
    await tx`
      UPDATE "AssetTransfer" SET status = ${rule.to},
        "checkedById" = CASE WHEN ${input.action} = 'check' THEN ${input.performedById} ELSE "checkedById" END,
        "approvedById" = CASE WHEN ${input.action} = 'approve' THEN ${input.performedById} ELSE "approvedById" END,
        "postedById" = CASE WHEN ${input.action} = 'post' THEN ${input.performedById} ELSE "postedById" END,
        "postedAt" = CASE WHEN ${input.action} = 'post' THEN NOW() ELSE "postedAt" END,
        remarks = COALESCE(${optional(input.remarks)}, remarks), "updatedAt" = NOW()
      WHERE id = ${input.id}
    `;
    if (input.action === "submit") await tx`UPDATE "Asset" SET status = 'IN_TRANSIT', "updatedAt" = NOW() WHERE id = ${transfer.assetId}`;
    if (input.action === "post") await tx`UPDATE "Asset" SET "locationId" = ${transfer.toLocationId}, status = CASE WHEN EXISTS (SELECT 1 FROM "AssetAssignment" aa WHERE aa."assetId" = ${transfer.assetId} AND aa.status = 'ACTIVE') THEN 'ASSIGNED'::"AssetStatus" ELSE 'ACTIVE'::"AssetStatus" END, "updatedAt" = NOW() WHERE id = ${transfer.assetId}`;
    if (["reject", "cancel"].includes(input.action)) await tx`UPDATE "Asset" SET status = CASE WHEN EXISTS (SELECT 1 FROM "AssetAssignment" aa WHERE aa."assetId" = ${transfer.assetId} AND aa.status = 'ACTIVE') THEN 'ASSIGNED'::"AssetStatus" ELSE 'ACTIVE'::"AssetStatus" END, "updatedAt" = NOW() WHERE id = ${transfer.assetId}`;
    await writeHistory(tx, {
      assetId: transfer.assetId, eventType: `ASSET_TRANSFER_${rule.to}`, referenceType: "asset-transfer", referenceId: input.id,
      oldStatus: transfer.assetStatus, newStatus: input.action === "submit" ? "IN_TRANSIT" : input.action === "post" || input.action === "cancel" || input.action === "reject" ? null : transfer.assetStatus,
      oldLocationId: transfer.fromLocationId, newLocationId: input.action === "post" ? transfer.toLocationId : transfer.fromLocationId,
      performedById: input.performedById, remarks: optional(input.remarks),
    });
  });
  return (await listAssetTransfers(assetId)).find((item) => item.id === input.id) ?? null;
}

export async function listAssetHistory(assetId: string): Promise<AssetHistoryRecord[]> {
  return sql<AssetHistoryRecord[]>`
    SELECT h.id, h."assetId", h."eventType", h."referenceType", h."referenceId", h."eventDate"::text AS "eventDate",
      h."oldStatus"::text AS "oldStatus", h."newStatus"::text AS "newStatus",
      ol."locationName" AS "oldLocationName", nl."locationName" AS "newLocationName", u.name AS "performedByName", h.remarks
    FROM "AssetHistory" h
    LEFT JOIN "Location" ol ON ol.id = h."oldLocationId"
    LEFT JOIN "Location" nl ON nl.id = h."newLocationId"
    LEFT JOIN "User" u ON u.id = h."performedById"
    WHERE h."assetId" = ${assetId}
    ORDER BY h."eventDate" DESC, h."createdAt" DESC
  `;
}

export async function transitionAssetLifecycle(input: { assetId: string; action: "retire" | "dispose"; performedById: string; remarks: string }) {
  const nextStatus = input.action === "retire" ? "RETIRED" : "DISPOSED";
  await sql.begin(async (tx) => {
    const rows = await tx<Array<{ id: string; status: string }>>`SELECT id, status::text AS status FROM "Asset" WHERE id = ${input.assetId} AND "isArchived" = false LIMIT 1 FOR UPDATE`;
    const asset = rows[0];
    if (!asset) throw new Error("Asset not found");
    if (["RETIRED", "DISPOSED", "IN_TRANSIT", "UNDER_MAINTENANCE"].includes(asset.status)) throw new Error(`Asset cannot be ${input.action}d while ${asset.status.toLowerCase().replace(/_/g, " ")}`);
    const blockers = await tx<Array<{ assignments: number; workOrders: number }>>`SELECT
      (SELECT COUNT(*)::int FROM "AssetAssignment" WHERE "assetId" = ${input.assetId} AND status = 'ACTIVE') AS assignments,
      (SELECT COUNT(*)::int FROM "MaintenanceWorkOrder" WHERE "assetId" = ${input.assetId} AND status NOT IN ('CLOSED', 'CANCELLED')) AS "workOrders"`;
    if (Number(blockers[0]?.assignments ?? 0) > 0) throw new Error("Return the active asset assignment before lifecycle closure");
    if (Number(blockers[0]?.workOrders ?? 0) > 0) throw new Error("Close or cancel active work orders before lifecycle closure");
    await tx`UPDATE "Asset" SET status = ${nextStatus}, "isActive" = false, "updatedById" = ${input.performedById}, "updatedAt" = NOW() WHERE id = ${input.assetId}`;
    await writeHistory(tx, { assetId: input.assetId, eventType: `ASSET_${nextStatus}`, oldStatus: asset.status, newStatus: nextStatus, performedById: input.performedById, remarks: required(input.remarks, "Lifecycle reason") });
  });
  return { id: input.assetId, status: nextStatus };
}

export async function listAssetQualityHistory(assetId: string) {
  return sql<Array<{
    id: string;
    testNo: string;
    sampleDate: string;
    testType: string;
    batchNo: string | null;
    result: string;
    status: string;
    failedParameters: number;
    nonconformityNo: string | null;
    maintenanceTicketId: string | null;
    maintenanceTicketNo: string | null;
    maintenanceStatus: string | null;
  }>>`
    SELECT test.id, test."testNo", test."sampleDate"::text AS "sampleDate", type.name AS "testType",
      batch."batchNo", test.result::text AS result, test.status,
      COUNT(result.id) FILTER (WHERE result.result IN ('FAILED', 'REJECTED'))::int AS "failedParameters",
      nc."ncNo" AS "nonconformityNo", ticket.id AS "maintenanceTicketId",
      ticket."ticketNo" AS "maintenanceTicketNo", ticket.status::text AS "maintenanceStatus"
    FROM "QCTest" test
    INNER JOIN "QCTestType" type ON type.id = test."testTypeId"
    LEFT JOIN "ProductionBatch" batch ON batch.id = test."productionBatchId"
    LEFT JOIN "QCTestResult" result ON result."qcTestId" = test.id
    LEFT JOIN "QCNonconformity" nc ON nc."qcTestId" = test.id
    LEFT JOIN "MaintenanceTicket" ticket ON ticket."qcTestId" = test.id
    WHERE test."assetId" = ${assetId}
    GROUP BY test.id, type.name, batch."batchNo", nc."ncNo", ticket.id
    ORDER BY test."sampleDate" DESC, test."createdAt" DESC
  `;
}

export type AssetMeterReadingRecord = {
  id: string;
  assetId: string;
  readingDate: string;
  readingType: string;
  readingValue: number;
  unit: string;
  source: string | null;
  shiftSessionId: string | null;
  recordedById: string;
  recordedByName: string | null;
  remarks: string | null;
  createdAt: string;
};

export async function listAssetMeterReadings(assetId: string): Promise<AssetMeterReadingRecord[]> {
  return sql<AssetMeterReadingRecord[]>`
    SELECT
      reading.id,
      reading."assetId",
      reading."readingDate"::text AS "readingDate",
      reading."readingType",
      reading."readingValue"::float8 AS "readingValue",
      reading.unit,
      reading.source,
      reading."shiftSessionId",
      reading."recordedById",
      recorded.name AS "recordedByName",
      reading.remarks,
      reading."createdAt"::text AS "createdAt"
    FROM "AssetMeterReading" reading
    LEFT JOIN "User" recorded ON recorded.id = reading."recordedById"
    WHERE reading."assetId" = ${assetId}
    ORDER BY reading."readingDate" DESC, reading."createdAt" DESC
  `;
}

export async function recordAssetMeterReading(input: {
  assetId: string;
  readingDate: string;
  readingType: string;
  readingValue: number;
  unit: string;
  source?: string;
  shiftSessionId?: string | null;
  recordedById: string;
  remarks?: string;
}) {
  if (!Number.isFinite(input.readingValue) || input.readingValue < 0) throw new Error("Meter reading must be zero or greater");
  const id = randomUUID();
  await sql.begin(async (tx) => {
    const assets = await tx<Array<{ currentMeterReading: number | null }>>`SELECT "currentMeterReading" FROM "Asset" WHERE id = ${input.assetId} LIMIT 1 FOR UPDATE`;
    if (!assets[0]) throw new Error("Asset not found");
    if (assets[0].currentMeterReading != null && input.readingValue < Number(assets[0].currentMeterReading)) throw new Error("Meter reading cannot be lower than the current reading");
    await tx`INSERT INTO "AssetMeterReading" (id, "assetId", "readingDate", "readingType", "readingValue", unit, source, "shiftSessionId", "recordedById", remarks, "createdAt") VALUES (${id}, ${input.assetId}, ${new Date(input.readingDate)}, ${required(input.readingType, "Reading type")}, ${input.readingValue}, ${required(input.unit, "Unit")}, ${optional(input.source)}, ${optional(input.shiftSessionId)}, ${input.recordedById}, ${optional(input.remarks)}, NOW())`;
    await tx`UPDATE "Asset" SET "meterType" = ${input.readingType}, "meterUnit" = ${input.unit}, "currentMeterReading" = ${input.readingValue}, "updatedAt" = NOW() WHERE id = ${input.assetId}`;
    await writeHistory(tx, { assetId: input.assetId, eventType: "ASSET_METER_READING", referenceType: "asset-meter-reading", referenceId: id, performedById: input.recordedById, remarks: optional(input.remarks) });
  });
  return { id };
}

export type AssetSparePartRecord = {
  id: string;
  assetId: string | null;
  assetTypeId: string | null;
  itemId: string;
  itemCode: string | null;
  itemName: string | null;
  uomName: string | null;
  isPreferred: boolean;
  minimumRecommendedQty: number | null;
  remarks: string | null;
  source: "ASSET" | "TYPE";
};

export async function listAssetSpareParts(assetId: string): Promise<AssetSparePartRecord[]> {
  try {
    return await sql<AssetSparePartRecord[]>`
    SELECT
      spare.id,
      spare."assetId",
      spare."assetTypeId",
      spare."itemId",
      item."itemCode",
      item."itemName",
      unit.name AS "uomName",
      spare."isPreferred",
      spare."minimumRecommendedQty"::float8 AS "minimumRecommendedQty",
      spare.remarks,
      CASE WHEN spare."assetId" IS NOT NULL THEN 'ASSET' ELSE 'TYPE' END AS source
    FROM "AssetSparePart" spare
    INNER JOIN "Item" item ON item.id = spare."itemId"
    LEFT JOIN "Unit" unit ON unit.id = item."uomId"
    WHERE spare."assetId" = ${assetId}
       OR spare."assetTypeId" = (SELECT "assetTypeId" FROM "Asset" WHERE id = ${assetId})
    ORDER BY spare."isPreferred" DESC, item."itemCode" ASC
  `;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("AssetSparePart")) return [];
    throw error;
  }
}

export async function createAssetSparePart(input: {
  assetId?: string | null;
  assetTypeId?: string | null;
  itemId: string;
  isPreferred?: boolean;
  minimumRecommendedQty?: number | null;
  remarks?: string | null;
}) {
  const assetId = optional(input.assetId);
  const assetTypeId = optional(input.assetTypeId);
  if (!assetId && !assetTypeId) throw new Error("Compatible spare parts must be linked to an asset or an asset type");
  const itemId = required(input.itemId, "Item");
  const id = randomUUID();
  await sql`
    INSERT INTO "AssetSparePart" (
      id, "assetId", "assetTypeId", "itemId", "isPreferred", "minimumRecommendedQty", remarks, "createdAt", "updatedAt"
    )
    VALUES (
      ${id}, ${assetId}, ${assetTypeId}, ${itemId}, ${input.isPreferred !== false},
      ${input.minimumRecommendedQty != null && Number.isFinite(Number(input.minimumRecommendedQty)) ? Number(input.minimumRecommendedQty) : null},
      ${optional(input.remarks)}, NOW(), NOW()
    )
  `;
  return { id };
}

export async function deleteAssetSparePart(id: string) {
  await sql`DELETE FROM "AssetSparePart" WHERE id = ${id}`;
}

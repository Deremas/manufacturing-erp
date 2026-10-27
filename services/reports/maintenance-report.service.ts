import { sql } from "@/lib/db";
import type { CommonReportFilters } from "@/services/reports/report-filter.service";

type MaintenanceScope = {
  accessibleLocationIds?: string[] | null;
};

export interface MaintenanceReportFilters extends CommonReportFilters {
  assetId?: string | null;
  priority?: string | null;
  maintenanceType?: string | null;
}

export interface MaintenanceReportReferenceData {
  assets: Array<{ value: string; label: string }>;
  locations: Array<{ value: string; label: string }>;
}

export interface MaintenanceAssetRegisterRow {
  id: string;
  assetCode: string;
  assetName: string;
  assetType: string;
  locationName: string | null;
  departmentName: string | null;
  status: string;
  criticality: string;
  lastMaintenanceDate: string | null;
  nextPmDueDate: string | null;
}

export interface MaintenanceWorkOrderReportRow {
  id: string;
  workOrderNo: string;
  ticketNo: string | null;
  assetId: string;
  assetCode: string | null;
  assetName: string | null;
  locationName: string | null;
  workType: string;
  priority: string;
  assignedTechnicianName: string | null;
  scheduledStart: string;
  actualEnd: string | null;
  status: string;
  totalCost: number;
}

export interface MaintenanceTicketReportRow {
  id: string;
  ticketNo: string;
  assetId: string;
  assetCode: string | null;
  assetName: string | null;
  locationName: string | null;
  type: string;
  priority: string;
  requestDate: string;
  targetCompletionDate: string | null;
  actualCompletionDate: string | null;
  requestedByName: string | null;
  assignedToName: string | null;
  productionDowntimeId: string | null;
  status: string;
}

export interface PreventiveMaintenanceReportRow {
  id: string;
  planNo: string;
  assetId: string;
  assetCode: string | null;
  assetName: string | null;
  locationName: string | null;
  title: string;
  maintenanceType: string;
  frequencyType: string;
  frequencyValue: number;
  triggerType?: string;
  leadTimeDays?: number;
  nextDueDate: string | null;
  lastCompletedDate: string | null;
  scheduledCount?: number;
  completedCount?: number;
  missedCount?: number;
  postponedCount?: number;
  compliancePercent?: number;
  overdue?: boolean;
  plannedSpareCost?: number;
  actualMaintenanceCost?: number;
  status: string;
}

export interface MaintenanceDowntimeReportRow {
  ticketId: string | null;
  ticketNo: string | null;
  downtimeId: string;
  assetId: string | null;
  assetCode: string | null;
  assetName: string | null;
  locationName: string | null;
  shiftSessionId: string;
  productionDate: string | null;
  reason: string;
  machine: string | null;
  startTime: string;
  endTime: string | null;
  durationMinutes: number;
  status: string;
}

export interface MaintenanceSpareUsageReportRow {
  partId: string;
  workOrderId: string;
  workOrderNo: string;
  assetId: string;
  assetCode: string | null;
  assetName: string | null;
  locationName: string | null;
  itemId: string;
  itemCode: string | null;
  itemName: string | null;
  uomName: string | null;
  requestedQty: number;
  issuedQty: number;
  usedQty: number;
  returnedQty: number;
  damagedQty: number;
  directIssue: boolean;
  unitCost: number;
  totalCost: number;
  status: string;
  scheduledStart: string;
}

export interface MaintenanceAssetCostReportRow {
  assetId: string;
  assetCode: string;
  assetName: string;
  locationName: string | null;
  workOrderCount: number;
  spareCost: number;
  laborCost: number;
  externalCost: number;
  totalCost: number;
  lastCompletionDate: string | null;
}

export interface MaintenanceWarrantyExpiryRow {
  assetId: string;
  assetCode: string;
  assetName: string;
  locationName: string | null;
  warrantyEnd: string;
  daysRemaining: number;
  status: string;
}

export interface MaintenanceDepartmentCostRow {
  departmentId: string | null;
  departmentName: string | null;
  workOrderCount: number;
  spareCost: number;
  laborCost: number;
  externalCost: number;
  totalCost: number;
}

export interface MaintenanceRepeatFailureRow {
  assetId: string;
  assetCode: string;
  assetName: string;
  locationName: string | null;
  breakdownCount: number;
  lastFailureDate: string | null;
  status: string;
}

function normalizeNullableString(value: string | null | undefined) {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : null;
}

function buildLocationScope(scope: MaintenanceScope, locationExpression: ReturnType<typeof sql>) {
  const locationIds = scope.accessibleLocationIds?.filter(Boolean) ?? [];
  if (!locationIds.length) {
    return sql``;
  }

  return sql`AND ${locationExpression} IN ${sql(locationIds)}`;
}

function buildDateFilters(filters: MaintenanceReportFilters, column: ReturnType<typeof sql>) {
  const dateFrom = normalizeNullableString(filters.dateFrom);
  const dateTo = normalizeNullableString(filters.dateTo);

  return sql`
    ${dateFrom ? sql`AND ${column} >= ${new Date(dateFrom)}` : sql``}
    ${dateTo ? sql`AND ${column} <= ${new Date(dateTo)}` : sql``}
  `;
}

export async function getMaintenanceReportReferenceData(
  scope: MaintenanceScope = {},
): Promise<MaintenanceReportReferenceData> {
  const locationIds = scope.accessibleLocationIds?.filter(Boolean) ?? [];
  const locationScope = locationIds.length ? sql`AND l.id IN ${sql(locationIds)}` : sql``;
  const assetScope = locationIds.length ? sql`AND a."locationId" IN ${sql(locationIds)}` : sql``;

  const [assets, locations] = await Promise.all([
    sql<Array<{ value: string; label: string }>>`
      SELECT a.id AS value, CONCAT(a."assetCode", ' - ', a."assetName") AS label
      FROM "Asset" a
      WHERE a."isArchived" = false
        AND a."isActive" = true
      ${assetScope}
      ORDER BY a."assetCode" ASC
    `,
    sql<Array<{ value: string; label: string }>>`
      SELECT l.id AS value, CONCAT(l."locationCode", ' - ', l."locationName") AS label
      FROM "Location" l
      WHERE l."isArchived" = false
        AND l."isActive" = true
      ${locationScope}
      ORDER BY l."locationName" ASC
    `,
  ]);

  return { assets, locations };
}

export async function getMaintenanceAssetRegisterReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
): Promise<MaintenanceAssetRegisterRow[]> {
  return sql<MaintenanceAssetRegisterRow[]>`
    SELECT
      a.id,
      a."assetCode",
      a."assetName",
      CONCAT(at.code, ' - ', at.name) AS "assetType",
      l."locationName",
      d.name AS "departmentName",
      a.status::text AS status,
      a.criticality::text AS criticality,
      (
        SELECT MAX(COALESCE(wo."actualEnd", wo."scheduledEnd", wo."scheduledStart"))::text
        FROM "MaintenanceWorkOrder" wo
        WHERE wo."assetId" = a.id
      ) AS "lastMaintenanceDate",
      (
        SELECT MIN(pm."nextDueDate")::text
        FROM "PreventiveMaintenancePlan" pm
        WHERE pm."assetId" = a.id
          AND pm.status::text IN ('ACTIVE', 'DRAFT', 'PAUSED')
      ) AS "nextPmDueDate"
    FROM "Asset" a
    INNER JOIN "AssetType" at ON at.id = a."assetTypeId"
    LEFT JOIN "Location" l ON l.id = a."locationId"
    LEFT JOIN "Department" d ON d.id = a."departmentId"
    WHERE a."isArchived" = false
    ${buildLocationScope(scope, sql`a."locationId"`)}
    ${buildDateFilters(filters, sql`a."createdAt"`)}
    ${filters.locationId ? sql`AND a."locationId" = ${filters.locationId}` : sql``}
    ${filters.assetId ? sql`AND a.id = ${filters.assetId}` : sql``}
    ${filters.status ? sql`AND a.status::text = ${filters.status}` : sql``}
    ORDER BY a."assetCode" ASC
  `;
}

export async function getMaintenanceWorkOrdersReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
): Promise<MaintenanceWorkOrderReportRow[]> {
  return sql<MaintenanceWorkOrderReportRow[]>`
    SELECT
      wo.id,
      wo."workOrderNo",
      mt."ticketNo",
      a.id AS "assetId",
      a."assetCode",
      a."assetName",
      l."locationName",
      wo."workType"::text AS "workType",
      wo.priority::text AS priority,
      tech.name AS "assignedTechnicianName",
      wo."scheduledStart"::text AS "scheduledStart",
      wo."actualEnd"::text AS "actualEnd",
      wo.status::text AS status,
      COALESCE(wo."totalCost", 0)::float8 AS "totalCost"
    FROM "MaintenanceWorkOrder" wo
    INNER JOIN "Asset" a ON a.id = wo."assetId"
    LEFT JOIN "MaintenanceTicket" mt ON mt.id = wo."ticketId"
    LEFT JOIN "Location" l ON l.id = wo."locationId"
    LEFT JOIN "User" tech ON tech.id = wo."assignedTechnicianId"
    WHERE true
    ${buildLocationScope(scope, sql`wo."locationId"`)}
    ${buildDateFilters(filters, sql`wo."scheduledStart"`)}
    ${filters.locationId ? sql`AND wo."locationId" = ${filters.locationId}` : sql``}
    ${filters.assetId ? sql`AND wo."assetId" = ${filters.assetId}` : sql``}
    ${filters.status ? sql`AND wo.status::text = ${filters.status}` : sql``}
    ORDER BY wo."scheduledStart" DESC, wo."workOrderNo" DESC
  `;
}

export async function getMaintenanceBreakdownsReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
): Promise<MaintenanceTicketReportRow[]> {
  return sql<MaintenanceTicketReportRow[]>`
    SELECT
      t.id,
      t."ticketNo",
      a.id AS "assetId",
      a."assetCode",
      a."assetName",
      l."locationName",
      t.type::text AS type,
      t.priority::text AS priority,
      t."requestDate"::text AS "requestDate",
      t."targetCompletionDate"::text AS "targetCompletionDate",
      t."actualCompletionDate"::text AS "actualCompletionDate",
      requested.name AS "requestedByName",
      assigned.name AS "assignedToName",
      t."productionDowntimeId",
      t.status::text AS status
    FROM "MaintenanceTicket" t
    INNER JOIN "Asset" a ON a.id = t."assetId"
    LEFT JOIN "Location" l ON l.id = t."locationId"
    LEFT JOIN "User" requested ON requested.id = t."requestedById"
    LEFT JOIN "User" assigned ON assigned.id = t."assignedToId"
    WHERE t."isArchived" = false
      AND t.type::text IN ('BREAKDOWN', 'CORRECTIVE', 'EMERGENCY')
    ${buildLocationScope(scope, sql`t."locationId"`)}
    ${buildDateFilters(filters, sql`t."requestDate"`)}
    ${filters.locationId ? sql`AND t."locationId" = ${filters.locationId}` : sql``}
    ${filters.assetId ? sql`AND t."assetId" = ${filters.assetId}` : sql``}
    ${filters.status ? sql`AND t.status::text = ${filters.status}` : sql``}
    ORDER BY t."requestDate" DESC, t."ticketNo" DESC
  `;
}

export async function getMaintenanceOpenTicketsReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
): Promise<MaintenanceTicketReportRow[]> {
  return sql<MaintenanceTicketReportRow[]>`
    SELECT
      t.id,
      t."ticketNo",
      a.id AS "assetId",
      a."assetCode",
      a."assetName",
      l."locationName",
      t.type::text AS type,
      t.priority::text AS priority,
      t."requestDate"::text AS "requestDate",
      t."targetCompletionDate"::text AS "targetCompletionDate",
      t."actualCompletionDate"::text AS "actualCompletionDate",
      requested.name AS "requestedByName",
      assigned.name AS "assignedToName",
      t."productionDowntimeId",
      t.status::text AS status
    FROM "MaintenanceTicket" t
    INNER JOIN "Asset" a ON a.id = t."assetId"
    LEFT JOIN "Location" l ON l.id = t."locationId"
    LEFT JOIN "User" requested ON requested.id = t."requestedById"
    LEFT JOIN "User" assigned ON assigned.id = t."assignedToId"
    WHERE t."isArchived" = false
      AND t.status::text NOT IN ('CLOSED', 'CANCELLED', 'REJECTED')
    ${buildLocationScope(scope, sql`t."locationId"`)}
    ${buildDateFilters(filters, sql`t."requestDate"`)}
    ${filters.locationId ? sql`AND t."locationId" = ${filters.locationId}` : sql``}
    ${filters.assetId ? sql`AND t."assetId" = ${filters.assetId}` : sql``}
    ${filters.status ? sql`AND t.status::text = ${filters.status}` : sql``}
    ORDER BY t."requestDate" DESC, t."ticketNo" DESC
  `;
}

export async function getPreventiveMaintenanceReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
): Promise<PreventiveMaintenanceReportRow[]> {
  return sql<PreventiveMaintenanceReportRow[]>`
    SELECT
      pm.id,
      pm."planNo",
      a.id AS "assetId",
      a."assetCode",
      a."assetName",
      l."locationName",
      pm.title,
      pm."maintenanceType"::text AS "maintenanceType",
      pm."frequencyType"::text AS "frequencyType",
      pm."frequencyValue",
      pm."triggerType"::text AS "triggerType",
      pm."leadTimeDays",
      pm."nextDueDate"::text AS "nextDueDate",
      pm."lastCompletedDate"::text AS "lastCompletedDate",
      COALESCE(metrics."scheduledCount",0)::int AS "scheduledCount",
      COALESCE(metrics."completedCount",0)::int AS "completedCount",
      COALESCE(metrics."missedCount",0)::int AS "missedCount",
      COALESCE(changes."postponedCount",0)::int AS "postponedCount",
      CASE WHEN COALESCE(metrics."scheduledCount",0)=0 THEN 100
        ELSE ROUND((COALESCE(metrics."completedCount",0)::numeric / metrics."scheduledCount") * 100, 2)::float END AS "compliancePercent",
      (pm.status='ACTIVE' AND pm."nextDueDate" IS NOT NULL AND pm."nextDueDate" < NOW() - (pm."gracePeriodDays" * INTERVAL '1 day')) AS overdue,
      COALESCE(spares."plannedSpareCost",0)::float AS "plannedSpareCost",
      COALESCE(metrics."actualMaintenanceCost",0)::float AS "actualMaintenanceCost",
      pm.status::text AS status
    FROM "PreventiveMaintenancePlan" pm
    INNER JOIN "Asset" a ON a.id = pm."assetId"
    LEFT JOIN "Location" l ON l.id = a."locationId"
    LEFT JOIN LATERAL (
      SELECT COUNT(*) AS "scheduledCount",
        COUNT(*) FILTER (WHERE execution.status='COMPLETED') AS "completedCount",
        COUNT(*) FILTER (WHERE execution.status='MISSED' OR (execution.status='SCHEDULED' AND execution."scheduledDate" < NOW() - (pm."gracePeriodDays" * INTERVAL '1 day'))) AS "missedCount",
        COALESCE(SUM(wo."totalCost") FILTER (WHERE execution.status='COMPLETED'),0) AS "actualMaintenanceCost"
      FROM "PreventiveMaintenanceExecution" execution
      LEFT JOIN "MaintenanceWorkOrder" wo ON wo.id=execution."workOrderId"
      WHERE execution."planId"=pm.id
    ) metrics ON true
    LEFT JOIN LATERAL (
      SELECT COUNT(*) FILTER (WHERE status='APPROVED') AS "postponedCount"
      FROM "PreventiveMaintenanceScheduleChange" change WHERE change."planId"=pm.id
    ) changes ON true
    LEFT JOIN LATERAL (
      SELECT COALESCE(SUM(spare.quantity * COALESCE(item."standardCost",0)),0) AS "plannedSpareCost"
      FROM "PreventiveMaintenancePlanSpare" spare INNER JOIN "Item" item ON item.id=spare."itemId"
      WHERE spare."planId"=pm.id
    ) spares ON true
    WHERE true
    ${buildLocationScope(scope, sql`a."locationId"`)}
    ${buildDateFilters(filters, sql`COALESCE(pm."nextDueDate", pm."createdAt")`)}
    ${filters.locationId ? sql`AND a."locationId" = ${filters.locationId}` : sql``}
    ${filters.assetId ? sql`AND pm."assetId" = ${filters.assetId}` : sql``}
    ${filters.status ? sql`AND pm.status::text = ${filters.status}` : sql``}
    ORDER BY COALESCE(pm."nextDueDate", pm."createdAt") ASC, pm."planNo" ASC
  `;
}

export async function getMaintenanceDowntimeReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
): Promise<MaintenanceDowntimeReportRow[]> {
  return sql<MaintenanceDowntimeReportRow[]>`
    SELECT
      t.id AS "ticketId",
      t."ticketNo",
      dt.id AS "downtimeId",
      a.id AS "assetId",
      a."assetCode",
      a."assetName",
      l."locationName",
      dt."shiftSessionId",
      ss."productionDate"::text AS "productionDate",
      COALESCE(reason.name, replace(dt.reason::text, '_', ' ')) AS reason,
      CASE WHEN a.id IS NULL THEN NULL ELSE a."assetCode" || ' - ' || a."assetName" END AS machine,
      dt."startTime"::text AS "startTime",
      dt."endTime"::text AS "endTime",
      dt."durationMinutes",
      dt.status AS status
    FROM "ProductionDowntime" dt
    LEFT JOIN "MaintenanceTicket" t ON t."productionDowntimeId" = dt.id AND t."isArchived" = false
    LEFT JOIN "DowntimeReasonConfig" reason ON reason.id = dt."reasonId"
    INNER JOIN "ShiftSession" ss ON ss.id = dt."shiftSessionId"
    LEFT JOIN "Asset" a ON a.id = dt."assetId"
    LEFT JOIN "Location" l ON l.id = dt."locationId"
    WHERE true
    ${buildLocationScope(scope, sql`dt."locationId"`)}
    ${buildDateFilters(filters, sql`dt."startTime"`)}
    ${filters.locationId ? sql`AND dt."locationId" = ${filters.locationId}` : sql``}
    ${filters.assetId ? sql`AND dt."assetId" = ${filters.assetId}` : sql``}
    ${filters.status ? sql`AND dt.status = ${filters.status}` : sql``}
    ORDER BY dt."startTime" DESC, dt."downtimeNo" DESC
  `;
}

export async function getMaintenanceSparePartsUsageReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
): Promise<MaintenanceSpareUsageReportRow[]> {
  return sql<MaintenanceSpareUsageReportRow[]>`
    SELECT
      part.id AS "partId",
      wo.id AS "workOrderId",
      wo."workOrderNo",
      a.id AS "assetId",
      a."assetCode",
      a."assetName",
      l."locationName",
      item.id AS "itemId",
      item."itemCode",
      item."itemName",
      unit.name AS "uomName",
      COALESCE(part."requestedQty", 0)::float8 AS "requestedQty",
      COALESCE(part."issuedQty", 0)::float8 AS "issuedQty",
      COALESCE(part."usedQty", 0)::float8 AS "usedQty",
      COALESCE(part."returnedQty", 0)::float8 AS "returnedQty",
      COALESCE(part."damagedQty", 0)::float8 AS "damagedQty",
      EXISTS (SELECT 1 FROM "MaintenanceSpareTrace" trace WHERE trace."workOrderPartId"=part.id AND trace."directIssue"=true) AS "directIssue",
      COALESCE(part."unitCost", 0)::float8 AS "unitCost",
      COALESCE(part."totalCost", 0)::float8 AS "totalCost",
      wo.status::text AS status,
      wo."scheduledStart"::text AS "scheduledStart"
    FROM "MaintenanceWorkOrderPart" part
    INNER JOIN "MaintenanceWorkOrder" wo ON wo.id = part."workOrderId"
    INNER JOIN "Asset" a ON a.id = wo."assetId"
    LEFT JOIN "Location" l ON l.id = wo."locationId"
    INNER JOIN "Item" item ON item.id = part."itemId"
    LEFT JOIN "Unit" unit ON unit.id = item."uomId"
    WHERE true
    ${buildLocationScope(scope, sql`wo."locationId"`)}
    ${buildDateFilters(filters, sql`wo."scheduledStart"`)}
    ${filters.locationId ? sql`AND wo."locationId" = ${filters.locationId}` : sql``}
    ${filters.assetId ? sql`AND wo."assetId" = ${filters.assetId}` : sql``}
    ${filters.status ? sql`AND wo.status::text = ${filters.status}` : sql``}
    ${filters.itemId ? sql`AND part."itemId" = ${filters.itemId}` : sql``}
    ORDER BY wo."scheduledStart" DESC, wo."workOrderNo" DESC
  `;
}

export async function getMaintenanceAssetCostReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
): Promise<MaintenanceAssetCostReportRow[]> {
  return sql<MaintenanceAssetCostReportRow[]>`
    SELECT
      a.id AS "assetId",
      a."assetCode",
      a."assetName",
      l."locationName",
      COUNT(wo.id)::int AS "workOrderCount",
      COALESCE(SUM(wo."totalSpareCost"), 0)::float8 AS "spareCost",
      COALESCE(SUM(wo."totalLaborCost"), 0)::float8 AS "laborCost",
      COALESCE(SUM(wo."totalExternalCost"), 0)::float8 AS "externalCost",
      COALESCE(SUM(wo."totalCost"), 0)::float8 AS "totalCost",
      MAX(COALESCE(wo."actualEnd", wo."scheduledEnd", wo."scheduledStart"))::text AS "lastCompletionDate"
    FROM "Asset" a
    LEFT JOIN "Location" l ON l.id = a."locationId"
    LEFT JOIN "MaintenanceWorkOrder" wo
      ON wo."assetId" = a.id
     ${filters.status ? sql`AND wo.status::text = ${filters.status}` : sql``}
     ${buildDateFilters(filters, sql`wo."scheduledStart"`)}
    WHERE a."isArchived" = false
    ${buildLocationScope(scope, sql`a."locationId"`)}
    ${filters.locationId ? sql`AND a."locationId" = ${filters.locationId}` : sql``}
    ${filters.assetId ? sql`AND a.id = ${filters.assetId}` : sql``}
    GROUP BY a.id, a."assetCode", a."assetName", l."locationName"
    ORDER BY "totalCost" DESC, a."assetCode" ASC
  `;
}

export async function getMaintenanceOpenWorkOrdersReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
) {
  return getMaintenanceWorkOrdersReport(scope, filters).then((rows) =>
    rows.filter((row) => !["CLOSED", "CANCELLED", "REJECTED"].includes(row.status)),
  );
}

export async function getMaintenanceOverdueWorkOrdersReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
): Promise<MaintenanceWorkOrderReportRow[]> {
  return sql<MaintenanceWorkOrderReportRow[]>`
    SELECT
      wo.id,
      wo."workOrderNo",
      mt."ticketNo",
      a.id AS "assetId",
      a."assetCode",
      a."assetName",
      l."locationName",
      wo."workType"::text AS "workType",
      wo.priority::text AS priority,
      tech.name AS "assignedTechnicianName",
      wo."scheduledStart"::text AS "scheduledStart",
      wo."actualEnd"::text AS "actualEnd",
      wo.status::text AS status,
      COALESCE(wo."totalCost", 0)::float8 AS "totalCost"
    FROM "MaintenanceWorkOrder" wo
    INNER JOIN "Asset" a ON a.id = wo."assetId"
    LEFT JOIN "MaintenanceTicket" mt ON mt.id = wo."ticketId"
    LEFT JOIN "Location" l ON l.id = wo."locationId"
    LEFT JOIN "User" tech ON tech.id = wo."assignedTechnicianId"
    WHERE wo.status::text NOT IN ('CLOSED', 'CANCELLED', 'REJECTED', 'COMPLETED', 'TESTED')
      AND COALESCE(wo."scheduledEnd", wo."scheduledStart") < NOW()
    ${buildLocationScope(scope, sql`wo."locationId"`)}
    ${buildDateFilters(filters, sql`wo."scheduledStart"`)}
    ${filters.locationId ? sql`AND wo."locationId" = ${filters.locationId}` : sql``}
    ${filters.assetId ? sql`AND wo."assetId" = ${filters.assetId}` : sql``}
    ${filters.status ? sql`AND wo.status::text = ${filters.status}` : sql``}
    ORDER BY COALESCE(wo."scheduledEnd", wo."scheduledStart") ASC, wo."workOrderNo" DESC
  `;
}

export async function getMaintenanceSpareDamageReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
) {
  const rows = await getMaintenanceSparePartsUsageReport(scope, filters);
  return rows.filter((row) => Number(row.damagedQty ?? 0) > 0);
}

export async function getMaintenanceDirectIssueReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
) {
  const rows = await getMaintenanceSparePartsUsageReport(scope, filters);
  return rows.filter((row) => row.directIssue);
}

export async function getPreventiveMaintenanceComplianceReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
) {
  return getPreventiveMaintenanceReport(scope, filters);
}

export async function getMaintenanceWarrantyExpiryReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
): Promise<MaintenanceWarrantyExpiryRow[]> {
  return sql<MaintenanceWarrantyExpiryRow[]>`
    SELECT
      a.id AS "assetId",
      a."assetCode",
      a."assetName",
      l."locationName",
      a."warrantyEnd"::text AS "warrantyEnd",
      GREATEST(CEIL(EXTRACT(EPOCH FROM (a."warrantyEnd" - NOW())) / 86400), -99999)::int AS "daysRemaining",
      a.status::text AS status
    FROM "Asset" a
    LEFT JOIN "Location" l ON l.id = a."locationId"
    WHERE a."isArchived" = false
      AND a."warrantyEnd" IS NOT NULL
    ${buildLocationScope(scope, sql`a."locationId"`)}
    ${buildDateFilters(filters, sql`a."warrantyEnd"`)}
    ${filters.locationId ? sql`AND a."locationId" = ${filters.locationId}` : sql``}
    ${filters.assetId ? sql`AND a.id = ${filters.assetId}` : sql``}
    ${filters.status ? sql`AND a.status::text = ${filters.status}` : sql``}
    ORDER BY a."warrantyEnd" ASC, a."assetCode" ASC
  `;
}

export async function getMaintenanceDepartmentCostReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
): Promise<MaintenanceDepartmentCostRow[]> {
  return sql<MaintenanceDepartmentCostRow[]>`
    SELECT
      d.id AS "departmentId",
      COALESCE(d.name, 'Unassigned') AS "departmentName",
      COUNT(wo.id)::int AS "workOrderCount",
      COALESCE(SUM(wo."totalSpareCost"), 0)::float8 AS "spareCost",
      COALESCE(SUM(wo."totalLaborCost"), 0)::float8 AS "laborCost",
      COALESCE(SUM(wo."totalExternalCost"), 0)::float8 AS "externalCost",
      COALESCE(SUM(wo."totalCost"), 0)::float8 AS "totalCost"
    FROM "MaintenanceWorkOrder" wo
    INNER JOIN "Asset" a ON a.id = wo."assetId"
    LEFT JOIN "Department" d ON d.id = a."departmentId"
    WHERE true
    ${buildLocationScope(scope, sql`wo."locationId"`)}
    ${buildDateFilters(filters, sql`wo."scheduledStart"`)}
    ${filters.locationId ? sql`AND wo."locationId" = ${filters.locationId}` : sql``}
    ${filters.assetId ? sql`AND wo."assetId" = ${filters.assetId}` : sql``}
    ${filters.status ? sql`AND wo.status::text = ${filters.status}` : sql``}
    GROUP BY d.id, d.name
    ORDER BY "totalCost" DESC, "departmentName" ASC
  `;
}

export async function getMaintenanceRepeatFailuresReport(
  scope: MaintenanceScope = {},
  filters: MaintenanceReportFilters = {},
): Promise<MaintenanceRepeatFailureRow[]> {
  return sql<MaintenanceRepeatFailureRow[]>`
    SELECT
      a.id AS "assetId",
      a."assetCode",
      a."assetName",
      l."locationName",
      COUNT(t.id)::int AS "breakdownCount",
      MAX(t."requestDate")::text AS "lastFailureDate",
      a.status::text AS status
    FROM "Asset" a
    LEFT JOIN "Location" l ON l.id = a."locationId"
    INNER JOIN "MaintenanceTicket" t
      ON t."assetId" = a.id
     AND t."isArchived" = false
     AND t.type::text IN ('BREAKDOWN', 'CORRECTIVE', 'EMERGENCY')
    ${buildDateFilters(filters, sql`t."requestDate"`)}
    ${filters.status ? sql`AND t.status::text = ${filters.status}` : sql``}
    WHERE a."isArchived" = false
    ${buildLocationScope(scope, sql`a."locationId"`)}
    ${filters.locationId ? sql`AND a."locationId" = ${filters.locationId}` : sql``}
    ${filters.assetId ? sql`AND a.id = ${filters.assetId}` : sql``}
    GROUP BY a.id, a."assetCode", a."assetName", l."locationName", a.status
    HAVING COUNT(t.id) > 1
    ORDER BY "breakdownCount" DESC, a."assetCode" ASC
  `;
}

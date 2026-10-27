import { sql } from "@/lib/db";

export type QcReportType = "task-status" | "parameter-trends" | "batch-release" | "hold-aging" | "corrective-actions" | "disposition-cost" | "machine-failures";
export interface QcReportFilters { dateFrom?: string; dateTo?: string; locationId?: string; status?: string; accessibleLocationIds?: string[]; }

function scope(filters: QcReportFilters, locationExpression: ReturnType<typeof sql>) {
  const dateFrom = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`) : null;
  const dateTo = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59.999`) : null;
  return sql`${dateFrom ? sql`AND source_date >= ${dateFrom}` : sql``}
    ${dateTo ? sql`AND source_date <= ${dateTo}` : sql``}
    ${filters.locationId ? sql`AND ${locationExpression} = ${filters.locationId}` : sql``}
    ${filters.accessibleLocationIds?.length ? sql`AND ${locationExpression} = ANY(${filters.accessibleLocationIds})` : sql``}`;
}

export async function getQcOperationalReport(type: QcReportType, filters: QcReportFilters) {
  if (type === "task-status") return sql<Array<Record<string, unknown>>>`
    SELECT * FROM (SELECT task."locationId" AS id, task."createdAt" AS source_date, task."taskNo" AS "Task No", test_type.name AS "Test Type", batch."batchNo" AS "Batch",
      item."itemCode" AS "Item", location."locationName" AS "Location", task.priority AS "Priority", task."dueDate"::date AS "Due Date",
      CASE WHEN task."dueDate" < NOW() AND task.status NOT IN ('COMPLETED','CANCELLED') THEN 'OVERDUE' ELSE task.status END AS "Status", assignee.name AS "Assigned To",
      '/qc/tasks/' || task.id AS "Source"
      FROM "QCTask" task INNER JOIN "QCTestType" test_type ON test_type.id = task."testTypeId" LEFT JOIN "ProductionBatch" batch ON batch.id = task."productionBatchId"
      LEFT JOIN "Item" item ON item.id = task."itemId" LEFT JOIN "Location" location ON location.id = task."locationId" LEFT JOIN "User" assignee ON assignee.id = task."assignedToId") report
    WHERE true ${scope(filters, sql`report.id`)} ORDER BY source_date DESC`;
  if (type === "parameter-trends") return sql<Array<Record<string, unknown>>>`
    SELECT * FROM (SELECT test."locationId" AS id, test."sampleDate" AS source_date, test."testNo" AS "Test No", type.name AS "Test Type", template.name AS "Template",
      parameter."parameterName" AS "Parameter", result."numericValue" AS "Numeric Value", result."textValue" AS "Text Value", result.result::text AS "Result",
      batch."batchNo" AS "Batch", location."locationName" AS "Location", '/qc/water-test/' || test.id AS "Source"
      FROM "QCTestResult" result INNER JOIN "QCTest" test ON test.id = result."qcTestId" INNER JOIN "QCTestTemplateParameter" parameter ON parameter.id = result."templateParameterId"
      LEFT JOIN "QCTestType" type ON type.id = test."testTypeId" LEFT JOIN "QCTestTemplate" template ON template.id = test."templateId" LEFT JOIN "ProductionBatch" batch ON batch.id = test."productionBatchId" LEFT JOIN "Location" location ON location.id = test."locationId") report
    WHERE true ${scope(filters, sql`report.id`)} ORDER BY source_date DESC`;
  if (type === "batch-release") return sql<Array<Record<string, unknown>>>`
    SELECT * FROM (SELECT hold."locationId" AS id, hold."createdAt" AS source_date, batch."batchNo" AS "Batch", item."itemCode" AS "Item", location."locationName" AS "Hold Location",
      hold."holdCategory" AS "Category", hold.quantity AS "Held Qty", hold."releasedQty" AS "Released Qty", hold."scrappedQty" AS "Scrapped Qty", hold."reworkedQty" AS "Reworked Qty", hold.status::text AS "Status",
      hold."releasedAt" AS "Released At", '/qc/hold-release/' || hold.id AS "Source" FROM "QCHoldRelease" hold LEFT JOIN "ProductionBatch" batch ON batch.id = hold."productionBatchId"
      INNER JOIN "Item" item ON item.id = hold."itemId" INNER JOIN "Location" location ON location.id = hold."locationId") report
    WHERE true ${scope(filters, sql`report.id`)} ORDER BY source_date DESC`;
  if (type === "hold-aging") return sql<Array<Record<string, unknown>>>`
    SELECT * FROM (SELECT hold."locationId" AS id, hold."createdAt" AS source_date, hold."holdNo" AS "Hold No", batch."batchNo" AS "Batch", item."itemCode" AS "Item", location."locationName" AS "Location",
      hold."holdCategory" AS "Category", hold.quantity - hold."releasedQty" - hold."scrappedQty" - hold."reworkedQty" - hold."rejectedQty" AS "Remaining Qty", EXTRACT(DAY FROM NOW() - hold."createdAt")::int AS "Age Days", hold.status::text AS "Status",
      '/qc/hold-release/' || hold.id AS "Source" FROM "QCHoldRelease" hold LEFT JOIN "ProductionBatch" batch ON batch.id = hold."productionBatchId" INNER JOIN "Item" item ON item.id = hold."itemId" INNER JOIN "Location" location ON location.id = hold."locationId") report
    WHERE true ${scope(filters, sql`report.id`)} ORDER BY "Age Days" DESC`;
  if (type === "corrective-actions") return sql<Array<Record<string, unknown>>>`
    SELECT * FROM (SELECT nc."locationId" AS id, nc."createdAt" AS source_date, nc."ncNo" AS "NC No", batch."batchNo" AS "Batch", nc.severity AS "Severity", nc."issueDescription" AS "Issue",
      nc."rootCause" AS "Root Cause", nc."correctiveAction" AS "Corrective Action", responsible.name AS "Responsible", nc."dueDate"::date AS "Due Date", nc."reinspectionResult" AS "Reinspection", nc.status AS "Status",
      '/qc/nonconformity/' || nc.id AS "Source" FROM "QCNonconformity" nc LEFT JOIN "ProductionBatch" batch ON batch.id = nc."productionBatchId" LEFT JOIN "User" responsible ON responsible.id = nc."responsiblePersonId") report
    WHERE true ${scope(filters, sql`report.id`)} ORDER BY source_date DESC`;
  if (type === "disposition-cost") return sql<Array<Record<string, unknown>>>`
    SELECT * FROM (SELECT disposition."fromLocationId" AS id, disposition."performedAt" AS source_date, disposition."dispositionNo" AS "Disposition No", batch."batchNo" AS "Batch", item."itemCode" AS "Item",
      disposition."dispositionType" AS "Type", disposition.quantity AS "Quantity", disposition."unitCost" AS "Unit Cost", disposition."totalCost" AS "Total Cost",
      journal."journalNo" AS "Journal No",
      disposition.reason AS "Reason", '/qc/hold-release/' || disposition."holdReleaseId" AS "Source" FROM "QCDisposition" disposition LEFT JOIN "ProductionBatch" batch ON batch.id = disposition."productionBatchId"
      INNER JOIN "Item" item ON item.id = disposition."itemId" LEFT JOIN "JournalEntry" journal ON journal.id = disposition."journalEntryId") report
    WHERE true ${scope(filters, sql`report.id`)} ORDER BY source_date DESC`;
  return sql<Array<Record<string, unknown>>>`
    SELECT * FROM (SELECT test."locationId" AS id, test."sampleDate" AS source_date, asset."assetCode" AS "Machine", asset."assetName" AS "Machine Name", test."testNo" AS "Test No", type.name AS "Test Type", test.result::text AS "Result",
      batch."batchNo" AS "Batch", ticket."ticketNo" AS "Maintenance Ticket", ticket.status::text AS "Ticket Status", '/maintenance/tickets/' || ticket.id AS "Source"
      FROM "QCTest" test INNER JOIN "QCTestType" type ON type.id = test."testTypeId" INNER JOIN "Asset" asset ON asset.id = test."assetId" LEFT JOIN "ProductionBatch" batch ON batch.id = test."productionBatchId" LEFT JOIN "MaintenanceTicket" ticket ON ticket."qcTestId" = test.id
      WHERE test.result IN ('FAILED','REJECTED')) report WHERE true ${scope(filters, sql`report.id`)} ORDER BY source_date DESC`;
}

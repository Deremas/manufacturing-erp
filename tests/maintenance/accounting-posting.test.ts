import assert from "node:assert/strict";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { closeMaintenanceWorkOrder, completeMaintenanceWorkOrder, getWorkOrderById, issueWorkOrderParts, updateWorkOrder } from "@/services/maintenance/maintenance.service";

import { closeTestDatabase, createMaintenanceTestContext, seedMaintenanceSpareStock } from "./_helpers";

after(closeTestDatabase);

test("completed maintenance work order creates balanced accounting journals for spare and external cost", async () => {
  const context = await createMaintenanceTestContext();
  await seedMaintenanceSpareStock(context, 20, 15);

  const workOrder = await getWorkOrderById(context.workOrderId);
  const partId = workOrder?.parts[0]?.id;
  if (!workOrder || !partId) {
    throw new Error("Expected maintenance work order with part line");
  }

  await issueWorkOrderParts({
    workOrderId: context.workOrderId,
    createdById: context.adminUserId,
    lines: [{ partId, quantity: 2, unitCost: 15, remarks: "Accounting test spare issue" }],
  });

  const issuedWorkOrder = await getWorkOrderById(context.workOrderId);
  if (!issuedWorkOrder) {
    throw new Error("Expected issued maintenance work order");
  }

  await updateWorkOrder(context.workOrderId, {
    ticketId: issuedWorkOrder.ticketId,
    assetId: issuedWorkOrder.assetId,
    locationId: issuedWorkOrder.locationId,
    assignedTechnicianId: issuedWorkOrder.assignedTechnicianId,
    supervisorId: issuedWorkOrder.supervisorId,
    workType: issuedWorkOrder.workType,
    priority: issuedWorkOrder.priority,
    scheduledStart: issuedWorkOrder.scheduledStart,
    scheduledEnd: issuedWorkOrder.scheduledEnd,
    actualStart: issuedWorkOrder.actualStart,
    actualEnd: issuedWorkOrder.actualEnd,
    problemDescription: issuedWorkOrder.problemDescription,
    diagnosis: issuedWorkOrder.diagnosis,
    workPerformed: issuedWorkOrder.workPerformed,
    rootCause: issuedWorkOrder.rootCause,
    correctiveAction: issuedWorkOrder.correctiveAction,
    preventiveAction: issuedWorkOrder.preventiveAction,
    testResult: issuedWorkOrder.testResult,
    status: "TESTED",
    completedById: context.adminUserId,
    approvedById: context.adminUserId,
    closedById: issuedWorkOrder.closedById,
    parts: issuedWorkOrder.parts.map((part) => ({ ...part, usedQty: part.issuedQty })),
    labor: issuedWorkOrder.labor,
    externalCosts: [
      {
        description: "External alignment support",
        amount: 50,
        remarks: "Vendor support",
      },
    ],
  });

  await completeMaintenanceWorkOrder({
    id: context.workOrderId,
    actualEnd: new Date().toISOString(),
    rootCause: "Accounting journal maintenance test",
    correctiveAction: "Spare replacement plus vendor support",
    testResult: "Operational test passed",
    status: "TESTED",
    completedById: context.adminUserId,
    approvedById: context.adminUserId,
  });

  await closeMaintenanceWorkOrder({
    id: context.workOrderId,
    closedById: context.adminUserId,
    closureRemarks: "Accounting test closure",
  });

  const journalRows = await sql<Array<{ id: string; totalDebit: number; totalCredit: number; status: string }>>`
    SELECT id, "totalDebit", "totalCredit", status::text AS status
    FROM "JournalEntry"
    WHERE "sourceType" = 'maintenance.work-order'
      AND "sourceId" = ${context.workOrderId}
    LIMIT 1
  `;

  const journal = journalRows[0];
  assert.ok(journal);
  assert.equal(journal?.status, "POSTED");
  assert.equal(journal?.totalDebit, 80);
  assert.equal(journal?.totalCredit, 80);

  const lineRows = await sql<Array<{ debit: number; credit: number }>>`
    SELECT debit, credit
    FROM "JournalLine"
    WHERE "journalEntryId" = ${journal!.id}
  `;

  assert.equal(lineRows.length, 4);
  const totalDebit = lineRows.reduce((sum, line) => sum + Number(line.debit ?? 0), 0);
  const totalCredit = lineRows.reduce((sum, line) => sum + Number(line.credit ?? 0), 0);
  assert.equal(totalDebit, 80);
  assert.equal(totalCredit, 80);
});

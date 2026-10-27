import assert from "node:assert/strict";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import {
  assignMaintenanceWorkOrder,
  closeMaintenanceWorkOrder,
  completeMaintenanceWorkOrder,
  getMaintenanceTicketById,
  getWorkOrderById,
} from "@/services/maintenance/maintenance.service";
import { testWorkOrder } from "@/services/maintenance/work-execution.service";

import { closeTestDatabase, createMaintenanceTestContext } from "./_helpers";

after(closeTestDatabase);

test("work order lifecycle assigns, starts, tests, and closes with linked ticket and asset state", async () => {
  const context = await createMaintenanceTestContext();

  await assignMaintenanceWorkOrder({
    id: context.workOrderId,
    assignedTechnicianId: context.secondUserId,
    supervisorId: context.adminUserId,
    startNow: true,
    performedById: context.adminUserId,
    remarks: "Start lifecycle verification",
  });

  const started = await getWorkOrderById(context.workOrderId);
  assert.equal(started?.status, "IN_PROGRESS");
  assert.ok(started?.actualStart);

  await completeMaintenanceWorkOrder({
    id: context.workOrderId,
    diagnosis: "Verified lifecycle fault",
    correctiveAction: "Corrected and tested",
    status: "COMPLETED",
    completedById: context.adminUserId,
    approvedById: context.adminUserId,
  });
  await testWorkOrder({ workOrderId: context.workOrderId, testedById: context.adminUserId, testMethod: "Operational run", machineRunMinutes: 15, result: "PASS" });
  await closeMaintenanceWorkOrder({
    id: context.workOrderId,
    closedById: context.adminUserId,
    closureRemarks: "Lifecycle verified",
  });

  const closed = await getWorkOrderById(context.workOrderId);
  const ticket = await getMaintenanceTicketById(context.ticketId);
  assert.equal(closed?.status, "CLOSED");
  assert.equal(closed?.closedById, context.adminUserId);
  assert.equal(ticket?.status, "CLOSED");
});

test("work order cannot close before completion and testing", async () => {
  const context = await createMaintenanceTestContext();
  await assert.rejects(
    closeMaintenanceWorkOrder({ id: context.workOrderId, closedById: context.adminUserId }),
    /Only completed or tested work orders can be closed/,
  );
});

test("failed repair close leaves the asset out of service", async () => {
  const context = await createMaintenanceTestContext();
  await sql`UPDATE "Asset" SET status = 'UNDER_MAINTENANCE' WHERE id = ${context.assetId}`;
  await assignMaintenanceWorkOrder({
    id: context.workOrderId,
    assignedTechnicianId: context.secondUserId,
    supervisorId: context.adminUserId,
    startNow: true,
    performedById: context.adminUserId,
    remarks: "Start unsuccessful repair",
  });
  await completeMaintenanceWorkOrder({
    id: context.workOrderId,
    diagnosis: "Could not restore the machine",
    correctiveAction: "Temporary isolation",
    status: "COMPLETED",
    completedById: context.adminUserId,
    approvedById: context.adminUserId,
  });
  await testWorkOrder({ workOrderId: context.workOrderId, testedById: context.adminUserId, testMethod: "Operational run", machineRunMinutes: 5, result: "FAIL" });
  await closeMaintenanceWorkOrder({
    id: context.workOrderId,
    closedById: context.adminUserId,
    closureRemarks: "Repair unsuccessful",
    leaveOutOfService: true,
  });
  const asset = await sql<Array<{ status: string }>>`SELECT status::text AS status FROM "Asset" WHERE id = ${context.assetId} LIMIT 1`;
  assert.equal(asset[0]?.status, "OUT_OF_SERVICE");
});

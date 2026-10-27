import assert from "node:assert/strict";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import { assignMaintenanceWorkOrder, closeMaintenanceWorkOrder, completeMaintenanceWorkOrder } from "@/services/maintenance/maintenance.service";
import { testWorkOrder } from "@/services/maintenance/work-execution.service";

import { closeTestDatabase, createDowntimeLinkedWorkOrderContext } from "./_helpers";

after(closeTestDatabase);

test("closing a maintenance work order appends downtime resolution details", async () => {
  const context = await createDowntimeLinkedWorkOrderContext();

  await assignMaintenanceWorkOrder({ id: context.workOrderId, assignedTechnicianId: context.production.secondUserId, supervisorId: context.production.adminUserId, startNow: true, performedById: context.production.adminUserId });

  await completeMaintenanceWorkOrder({
    id: context.workOrderId,
    actualStart: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
    actualEnd: new Date().toISOString(),
    rootCause: "Failed bearing assembly",
    correctiveAction: "Replaced bearing and aligned drive shaft",
    testResult: "Machine restored to service",
    status: "COMPLETED",
    completedById: context.production.adminUserId,
    closedById: context.production.adminUserId,
  });
  await testWorkOrder({ workOrderId: context.workOrderId, testedById: context.production.adminUserId, testMethod: "Production trial", result: "PASS" });
  await closeMaintenanceWorkOrder({ id: context.workOrderId, closedById: context.production.adminUserId });

  const rows = await sql<Array<{ remarks: string | null }>>`
    SELECT remarks
    FROM "ProductionDowntime"
    WHERE id = ${context.downtimeId}
    LIMIT 1
  `;

  const remarks = rows[0]?.remarks ?? "";
  assert.match(remarks, /Failed bearing assembly/i);
  assert.match(remarks, /Replaced bearing and aligned drive shaft/i);
  assert.match(remarks, /Maintenance work order/i);
});

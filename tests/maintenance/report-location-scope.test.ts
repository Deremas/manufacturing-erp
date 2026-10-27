import assert from "node:assert/strict";
import { after, test } from "node:test";

import { getMaintenanceWorkOrdersReport } from "@/services/reports/maintenance-report.service";

import { closeTestDatabase, createMaintenanceTestContext } from "./_helpers";

after(closeTestDatabase);

test("maintenance work-order report respects accessible location scope", async () => {
  const context = await createMaintenanceTestContext();

  const visibleRows = await getMaintenanceWorkOrdersReport({
    accessibleLocationIds: [context.sourceLocationId],
  });

  assert.ok(visibleRows.some((row) => row.id === context.workOrderId));

  const hiddenRows = await getMaintenanceWorkOrdersReport({
    accessibleLocationIds: ["location-not-allowed"],
  });

  assert.equal(hiddenRows.some((row) => row.id === context.workOrderId), false);
});

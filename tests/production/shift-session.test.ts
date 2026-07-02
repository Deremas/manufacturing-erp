import assert from "node:assert/strict";
import { after, test } from "node:test";

import { closeTestDatabase } from "../inventory/_helpers";
import { createProductionTestContext } from "./_helpers";
import { startShiftSession } from "@/services/shift/shift-session.service";

after(closeTestDatabase);

test("Shift session prevents duplicate active shift", async () => {
  const context = await createProductionTestContext();
  const today = new Date(Date.now() + (30 + Math.floor(Math.random() * 365)) * 24 * 60 * 60 * 1000).toISOString();

  await startShiftSession({
    productionDate: today,
    shiftCode: "SHIFT_A",
    locationId: context.productionLocationId,
    startedById: context.adminUserId,
    attendance: [{ userId: context.adminUserId, role: "Supervisor" }],
  });

  await assert.rejects(
    () => startShiftSession({
      productionDate: today,
      shiftCode: "SHIFT_A",
      locationId: context.productionLocationId,
      startedById: context.adminUserId,
      attendance: [{ userId: context.secondUserId, role: "Operator" }],
    }),
    /active shift session already exists/i,
  );
});

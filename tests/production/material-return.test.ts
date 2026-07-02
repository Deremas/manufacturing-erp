import assert from "node:assert/strict";
import { after, test } from "node:test";

import { closeTestDatabase, ensureStock, getStockBalance } from "../inventory/_helpers";
import { createProductionTestContext } from "./_helpers";
import { startShiftSession } from "@/services/shift/shift-session.service";
import { createProductionMaterialIssue, createProductionMaterialReturn, postProductionMaterialIssue, postProductionMaterialReturn } from "@/services/shift/shift-material.service";

after(closeTestDatabase);

function uniqueProductionDate() {
  return new Date(Date.now() + (30 + Math.floor(Math.random() * 365)) * 24 * 60 * 60 * 1000).toISOString();
}

test("Material return increases stock", async () => {
  const context = await createProductionTestContext();
  await ensureStock({
    adminUserId: context.adminUserId,
    secondUserId: context.secondUserId,
    departmentId: "",
    sourceLocationId: context.storeLocationId,
    destinationLocationId: context.outputLocationId,
    quarantineLocationId: context.productionLocationId,
    itemId: context.rawItemId,
    itemCode: "RAW-TEST",
  }, 40, 12, context.storeLocationId);

  const session = await startShiftSession({
    productionDate: uniqueProductionDate(),
    shiftCode: "SHIFT_B",
    locationId: context.productionLocationId,
    startedById: context.adminUserId,
    attendance: [{ userId: context.adminUserId, role: "Supervisor" }],
  });

  const issue = await createProductionMaterialIssue({
    shiftSessionId: session.id,
    storeLocationId: context.storeLocationId,
    productionLocationId: context.productionLocationId,
    createdById: context.adminUserId,
    status: "ACTIVE",
    items: [{ itemId: context.rawItemId, uomId: context.rawUomId, issuedQty: 10, unitCost: 12 }],
  });
  await postProductionMaterialIssue(issue.id, context.adminUserId);
  const beforeReturn = await getStockBalance(context.rawItemId, context.storeLocationId);

  const returnDoc = await createProductionMaterialReturn({
    shiftSessionId: session.id,
    fromLocationId: context.productionLocationId,
    toStoreLocationId: context.storeLocationId,
    createdById: context.adminUserId,
    status: "ACTIVE",
    items: [{ itemId: context.rawItemId, uomId: context.rawUomId, returnedQty: 4, condition: "Good", unitCost: 12 }],
  });
  await postProductionMaterialReturn(returnDoc.id, context.adminUserId);

  const afterReturn = await getStockBalance(context.rawItemId, context.storeLocationId);
  assert.equal(afterReturn.quantity, beforeReturn.quantity + 4);
});

import assert from "node:assert/strict";
import { after, test } from "node:test";

import { closeTestDatabase, ensureStock } from "../inventory/_helpers";
import { createProductionTestContext } from "./_helpers";
import { createBom } from "@/services/production/bom.service";
import { createProductionBatch, getProductionBatchById, postProductionBatch } from "@/services/production/production-batch.service";
import { createOverheadCostSetting } from "@/services/production/overhead-cost.service";
import { startShiftSession } from "@/services/shift/shift-session.service";
import { createProductionMaterialIssue, postProductionMaterialIssue } from "@/services/shift/shift-material.service";

after(closeTestDatabase);

function uniqueProductionDate() {
  return new Date(Date.now() + (30 + Math.floor(Math.random() * 365)) * 24 * 60 * 60 * 1000).toISOString();
}

test("Cost report reads actual issue and output movement costs", async () => {
  const context = await createProductionTestContext();
  await ensureStock({
    adminUserId: context.adminUserId,
    secondUserId: context.secondUserId,
    departmentId: "",
    sourceLocationId: context.storeLocationId,
    destinationLocationId: context.outputLocationId,
    quarantineLocationId: context.productionLocationId,
    itemId: context.rawItemId,
    itemCode: "RAW-COST",
  }, 100, 12, context.storeLocationId);

  const bom = await createBom({
    bomName: "Costing BOM",
    finishedGoodId: context.fgItemId,
    outputQty: 10,
    uomId: context.fgUomId,
    createdById: context.adminUserId,
    items: [{ componentItemId: context.rawItemId, uomId: context.rawUomId, quantity: 10 }],
  });
  await createOverheadCostSetting({
    categoryName: "Utilities",
    allocationMethod: "FIXED_PER_SHIFT",
    rate: 50,
    effectiveFrom: new Date().toISOString(),
    createdById: context.adminUserId,
  });

  const session = await startShiftSession({
    productionDate: uniqueProductionDate(),
    shiftCode: "SHIFT_A",
    locationId: context.productionLocationId,
    startedById: context.adminUserId,
    attendance: [{ userId: context.adminUserId }],
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

  const batch = await createProductionBatch({
    shiftSessionId: session.id,
    bomId: bom.id,
    finishedGoodId: context.fgItemId,
    locationId: context.outputLocationId,
    producedQty: 10,
    acceptedQty: 10,
    rejectedQty: 0,
    wastageQty: 0,
    createdById: context.adminUserId,
    status: "COMPLETED",
  });
  await postProductionBatch(batch.id, context.adminUserId);

  const detail = await getProductionBatchById(batch.id);
  assert.ok(detail?.costRecord);
  assert.ok(Number(detail?.costRecord?.materialCost ?? 0) >= 120);
  assert.ok(Number(detail?.costRecord?.costPerUnit ?? 0) > 0);
});

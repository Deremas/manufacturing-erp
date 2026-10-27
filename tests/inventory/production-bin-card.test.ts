import assert from "node:assert/strict";
import { after, test } from "node:test";

import { closeTestDatabase, createInventoryTestContext } from "./_helpers";
import { createProductionTestContext } from "../production/_helpers";
import { startShiftSession } from "@/services/shift/shift-session.service";
import { createProductionBatch, postProductionBatch } from "@/services/production/production-batch.service";
import { postAdjustment } from "@/services/inventory/inventory-posting.service";
import {
  getProductionBinCardRegister,
  listProductionBinCardRows,
  postProductionBinCardStock,
} from "@/services/inventory/production-bin-card.service";

after(closeTestDatabase);

function uniqueProductionDate() {
  return new Date(Date.now() + (90 + Math.floor(Math.random() * 365)) * 24 * 60 * 60 * 1000).toISOString();
}

test("production bin card filter/report behavior", async () => {
  const context = await createProductionTestContext();
  const session = await startShiftSession({
    productionDate: uniqueProductionDate(),
    shiftCode: "SHIFT_BIN",
    locationId: context.productionLocationId,
    startedById: context.adminUserId,
    attendance: [{ userId: context.adminUserId, role: "Supervisor" }],
  });

  const batch = await createProductionBatch({
    shiftSessionId: session.id,
    finishedGoodId: context.fgItemId,
    locationId: context.outputLocationId,
    producedQty: 4,
    acceptedQty: 4,
    rejectedQty: 0,
    wastageQty: 0,
    createdById: context.adminUserId,
    status: "COMPLETED",
  });

  await postProductionBatch(batch.id, context.adminUserId);

  const rows = await listProductionBinCardRows({
    itemId: context.fgItemId,
    locationId: context.outputLocationId,
  });

  assert.ok(rows.some((row) => row.batchNo === batch.batchNo || row.referenceNo === batch.batchNo));
  assert.ok(rows.some((row) => row.movementType === "PRODUCTION_RECEIPT"));
});

test("unfiltered production bin card omits test adjustments and uses document numbers", async () => {
  const inventory = await createInventoryTestContext();
  await postAdjustment({
    itemId: inventory.itemId,
    locationId: inventory.sourceLocationId,
    differenceQty: 8,
    unitCost: 11,
    sourceDocumentId: inventory.itemId,
    remarks: "Inventory adjustment document",
    createdById: inventory.adminUserId,
  });

  const posted = await postProductionBinCardStock({
    itemId: inventory.itemId,
    locationId: inventory.sourceLocationId,
    quantity: 5,
    unitCost: 12.5,
    direction: "add",
    remarks: "Bin card add",
    createdById: inventory.adminUserId,
  });

  const unfiltered = await getProductionBinCardRegister();
  assert.equal(
    unfiltered.lines.some((row) => row.itemCode === inventory.itemCode),
    false,
    "placeholder test items should not appear until explicitly filtered",
  );

  const filtered = await getProductionBinCardRegister({ itemId: inventory.itemId });
  const binCardRow = filtered.lines.find((row) => row.id === posted.movementId);
  assert.ok(binCardRow);
  assert.equal(binCardRow?.sourceModule, "production.bin-card");
  assert.equal(binCardRow?.referenceNo, posted.movementNumber);
  assert.equal(binCardRow?.itemLabel, `${inventory.itemCode} - Inventory Test Item`);
  assert.equal(
    filtered.lines.some((row) => row.referenceNo === inventory.itemId),
    false,
  );
});

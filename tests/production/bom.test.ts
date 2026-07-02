import assert from "node:assert/strict";
import { after, test } from "node:test";

import { closeTestDatabase } from "../inventory/_helpers";
import { createProductionTestContext } from "./_helpers";
import { createBom, getBomById } from "@/services/production/bom.service";

after(closeTestDatabase);

test("BOM saves with DB items and UOM", async () => {
  const context = await createProductionTestContext();
  const created = await createBom({
    bomName: "Bottle 500ml BOM",
    finishedGoodId: context.fgItemId,
    outputQty: 100,
    uomId: context.fgUomId,
    isDefault: true,
    createdById: context.adminUserId,
    items: [{
      componentItemId: context.rawItemId,
      uomId: context.rawUomId,
      quantity: 25,
      wastagePercent: 2,
      required: true,
    }],
  });

  const bom = await getBomById(created.id);
  assert.ok(bom);
  assert.equal(bom?.finishedGoodId, context.fgItemId);
  assert.equal(bom?.items.length, 1);
  assert.equal(bom?.items[0]?.componentItemId, context.rawItemId);
});

test("BOM blocks duplicate components", async () => {
  const context = await createProductionTestContext();
  await assert.rejects(
    () => createBom({
      bomName: "Duplicate Component BOM",
      finishedGoodId: context.fgItemId,
      outputQty: 10,
      createdById: context.adminUserId,
      items: [
        { componentItemId: context.rawItemId, quantity: 2 },
        { componentItemId: context.rawItemId, quantity: 3 },
      ],
    }),
    /Duplicate BOM component items/i,
  );
});

import assert from "node:assert/strict";
import { after, test } from "node:test";

import { createPriceList, duplicatePriceList } from "@/services/master-data/priceListService";

import {
  archivePricingArtifacts,
  closeTestDatabase,
  createPricingTestContext,
} from "./_helpers";

after(closeTestDatabase);

test("duplicatePriceList clones header and item snapshot", async () => {
  const context = await createPricingTestContext();

  const created = await createPriceList(
    {
      code: `PL-D-${Date.now()}`,
      name: "Duplicate source",
      channel: "TRUCK",
      currency: "ETB",
      effectiveFrom: new Date().toISOString(),
      isDefault: false,
      isActive: true,
      items: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          unitPrice: 200,
          minimumQty: 1,
          taxIncluded: false,
          isActive: true,
        },
      ],
    },
    context.userId,
    context.userName,
  );

  const duplicate = await duplicatePriceList(created.id, context.userId, context.userName);

  assert.notEqual(duplicate.id, created.id);
  assert.equal(duplicate.channel, created.channel);
  assert.equal(duplicate.items?.length, created.items?.length);
  assert.equal(duplicate.items?.[0]?.sellingPrice, created.items?.[0]?.sellingPrice);
  assert.equal(duplicate.isDefault, false);

  await archivePricingArtifacts(context);
});

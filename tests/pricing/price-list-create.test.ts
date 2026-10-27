import assert from "node:assert/strict";
import { after, test } from "node:test";

import { createPriceList, getPriceListById } from "@/services/master-data/priceListService";

import {
  archivePricingArtifacts,
  closeTestDatabase,
  createPricingTestContext,
} from "./_helpers";

after(closeTestDatabase);

test("createPriceList saves a live multi-line FG price list", async () => {
  const context = await createPricingTestContext();

  const created = await createPriceList(
    {
      code: `PL-T-${Date.now()}`,
      name: "Factory test list",
      channel: "FACTORY",
      currency: "ETB",
      effectiveFrom: new Date().toISOString(),
      isDefault: false,
      isActive: true,
      items: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          unitPrice: 145.5,
          minimumQty: 1,
          taxIncluded: false,
          isActive: true,
        },
      ],
    },
    context.userId,
    context.userName,
  );

  assert.ok(created.id);
  assert.equal(created.items?.length, 1);
  assert.equal(created.items?.[0]?.itemId, context.fgItemId);
  assert.equal(created.items?.[0]?.sellingPrice, 145.5);

  const loaded = await getPriceListById(created.id);
  assert.equal(loaded?.channel, "FACTORY");
  assert.equal(loaded?.items?.[0]?.itemCode, context.fgItemCode);

  await archivePricingArtifacts(context);
});

import assert from "node:assert/strict";
import { after, test } from "node:test";

import { createPriceList } from "@/services/master-data/priceListService";

import {
  archivePricingArtifacts,
  closeTestDatabase,
  createPricingTestContext,
} from "./_helpers";

after(closeTestDatabase);

test("default price list overlap is blocked for the same channel", async () => {
  const context = await createPricingTestContext();
  const effectiveFrom = "2000-01-01T00:00:00.000Z";
  const effectiveTo = "2000-12-31T23:59:59.999Z";

  await createPriceList(
    {
      code: `PL-DEF-A-${Date.now()}`,
      name: "Factory default A",
      channel: "FACTORY",
      currency: "ETB",
      effectiveFrom,
      effectiveTo,
      isDefault: true,
      isActive: true,
      items: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          unitPrice: 110,
          minimumQty: 1,
          taxIncluded: false,
          isActive: true,
        },
      ],
    },
    context.userId,
    context.userName,
  );

  await assert.rejects(
    () =>
      createPriceList(
        {
          code: `PL-DEF-B-${Date.now()}`,
          name: "Factory default B",
          channel: "FACTORY",
          currency: "ETB",
          effectiveFrom,
          effectiveTo,
          isDefault: true,
          isActive: true,
          items: [
            {
              itemId: context.fgItemId,
              unitId: context.unitId,
              unitPrice: 112,
              minimumQty: 1,
              taxIncluded: false,
              isActive: true,
            },
          ],
        },
        context.userId,
        context.userName,
      ),
    /already exists for this channel and date range/i,
  );

  await archivePricingArtifacts(context);
});

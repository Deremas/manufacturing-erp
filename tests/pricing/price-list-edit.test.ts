import assert from "node:assert/strict";
import { after, test } from "node:test";

import { createPriceList, updatePriceList } from "@/services/master-data/priceListService";

import {
  archivePricingArtifacts,
  closeTestDatabase,
  createPricingTestContext,
} from "./_helpers";

after(closeTestDatabase);

test("updatePriceList reloads existing lines and persists changes", async () => {
  const context = await createPricingTestContext();

  const created = await createPriceList(
    {
      code: `PL-E-${Date.now()}`,
      name: "Editable price list",
      channel: "FACTORY",
      currency: "ETB",
      effectiveFrom: new Date().toISOString(),
      isDefault: false,
      isActive: true,
      items: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          unitPrice: 120,
          minimumQty: 1,
          taxIncluded: false,
          isActive: true,
        },
      ],
    },
    context.userId,
    context.userName,
  );

  const updated = await updatePriceList(
    created.id,
    {
      name: "Editable price list revised",
      items: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          unitPrice: 155,
          minimumQty: 3,
          taxIncluded: true,
          isActive: true,
        },
      ],
    },
    context.userId,
    context.userName,
  );

  assert.equal(updated.name, "Editable price list revised");
  assert.equal(updated.items?.[0]?.sellingPrice, 155);
  assert.equal(updated.items?.[0]?.minimumQty, 3);
  assert.equal(updated.items?.[0]?.taxIncluded, true);

  await archivePricingArtifacts(context);
});

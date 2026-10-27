import assert from "node:assert/strict";
import { after, test } from "node:test";

import { createPriceList } from "@/services/master-data/priceListService";
import { applyPriceToLine, getItemPrice } from "@/services/pricing/pricing.service";

import {
  archivePricingArtifacts,
  closeTestDatabase,
  createPricingTestContext,
} from "./_helpers";

after(closeTestDatabase);

test("pricing resolver prefers location-specific branch prices over default branch prices", async () => {
  const context = await createPricingTestContext();
  const effectiveFrom = "2000-01-01T00:00:00.000Z";
  const effectiveTo = "2000-12-31T23:59:59.999Z";

  await createPriceList(
    {
      code: `PL-BR-DEFAULT-${Date.now()}`,
      name: "Branch default",
      channel: "BRANCH",
      currency: "ETB",
      effectiveFrom,
      effectiveTo,
      isDefault: false,
      isActive: true,
      items: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          unitPrice: 300,
          minimumQty: 1,
          taxIncluded: false,
          isActive: true,
        },
      ],
    },
    context.userId,
    context.userName,
  );

  await createPriceList(
    {
      code: `PL-BR-LOC-${Date.now()}`,
      name: "Branch specific",
      channel: "BRANCH",
      currency: "ETB",
      effectiveFrom,
      effectiveTo,
      locationId: context.branchLocationId,
      isDefault: false,
      isActive: true,
      items: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          unitPrice: 275,
          minimumQty: 1,
          taxIncluded: true,
          isActive: true,
        },
      ],
    },
    context.userId,
    context.userName,
  );

  const resolved = await getItemPrice(
    context.fgItemId,
    "BRANCH",
    effectiveFrom,
    2,
    {
      locationId: context.branchLocationId,
      customerGroup: context.customerGroup,
    },
  );

  assert.equal(resolved.unitPrice, 275);
  assert.equal(resolved.channel, "BRANCH");
  assert.ok(resolved.priceListCode?.includes("PL-BR-LOC"));

  const applied = await applyPriceToLine(
    context.fgItemId,
    "BRANCH",
    4,
    effectiveFrom,
    {
      locationId: context.branchLocationId,
    },
  );

  assert.equal(applied.unitPrice, 275);
  assert.equal(applied.lineTotal, 1100);

  await archivePricingArtifacts(context);
});

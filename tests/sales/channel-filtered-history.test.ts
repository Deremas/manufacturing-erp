import assert from "node:assert/strict";
import { after, test } from "node:test";

import { postOpeningStock } from "@/services/inventory/inventory-posting.service";
import { createPriceList } from "@/services/master-data/priceListService";
import { createPostedSale, listSales } from "@/services/sales/sales.service";

import {
  archiveSalesArtifacts,
  closeTestDatabase,
  createSalesTestContext,
} from "./_helpers";

after(closeTestDatabase);

test("channel-filtered sales history returns only sales for the requested channel", async () => {
  const context = await createSalesTestContext();

  await createPriceList(
    {
      code: `PL-BRANCH-HIST-${Date.now()}`,
      name: "Branch history price list",
      channel: "BRANCH",
      currency: "ETB",
      locationId: context.branchLocationId,
      effectiveFrom: new Date().toISOString(),
      isDefault: false,
      isActive: true,
      items: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          unitPrice: 188,
          minimumQty: 1,
          taxIncluded: false,
          isActive: true,
        },
      ],
    },
    context.userId,
    context.userName,
  );

  await postOpeningStock({
    itemId: context.fgItemId,
    locationId: context.branchLocationId,
    sourceModule: "sales.branch.history.test",
    sourceDocumentId: `branch-hist-open-${Date.now()}`,
    qtyIn: 8,
    qtyOut: 0,
    unitCost: 40,
    remarks: "Branch history opening stock",
    createdById: context.userId,
  });

  const factorySale = await createPostedSale(
    {
      saleDate: new Date().toISOString(),
      locationId: context.factoryLocationId,
      paymentMethod: "CASH",
      lines: [{ itemId: context.fgItemId, quantity: 1 }],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  const branchSale = await createPostedSale(
    {
      saleDate: new Date().toISOString(),
      locationId: context.branchLocationId,
      paymentMethod: "CASH",
      lines: [{ itemId: context.fgItemId, quantity: 1 }],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  const branchOnly = await listSales({ channel: "BRANCH" });

  assert.equal(branchOnly.some((item) => item.id === branchSale.id), true);
  assert.equal(branchOnly.some((item) => item.id === factorySale.id), false);
  assert.equal(branchOnly.every((item) => item.channel === "BRANCH"), true);

  await archiveSalesArtifacts(context);
});

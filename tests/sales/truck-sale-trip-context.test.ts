import assert from "node:assert/strict";
import { after, test } from "node:test";

import { createPriceList } from "@/services/master-data/priceListService";
import { createPostedSale, getSaleById } from "@/services/sales/sales.service";
import {
  archiveFleetTrip,
  archiveVehicle,
  createFleetTrip,
  createVehicle,
} from "@/services/fleet/fleet.service";

import {
  archiveSalesArtifacts,
  closeTestDatabase,
  createSalesTestContext,
} from "./_helpers";

after(closeTestDatabase);

test("truck sale saves truck and trip context on the posted sale snapshot", async () => {
  const context = await createSalesTestContext();

  await createPriceList(
    {
      code: `PL-TRUCK-CTX-${Date.now()}`,
      name: "Truck trip context price list",
      channel: "TRUCK",
      currency: "ETB",
      effectiveFrom: new Date().toISOString(),
      isDefault: false,
      isActive: true,
      items: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          unitPrice: 211,
          minimumQty: 1,
          taxIncluded: false,
          isActive: true,
        },
      ],
    },
    context.userId,
    context.userName,
  );

  const vehicle = await createVehicle({
    vehicleCode: `TRKSALE-${Date.now()}`,
    plateNumber: `TS-${Date.now().toString().slice(-4)}`,
    vehicleName: "Truck sale vehicle",
    vehicleType: "TRUCK",
    capacity: 1400,
    isActive: true,
  });

  const trip = await createFleetTrip({
    tripNo: `TS-TRIP-${Date.now()}`,
    tripDate: new Date().toISOString(),
    vehicleId: vehicle.id,
    fromLocationId: context.factoryLocationId,
    destinationId: context.branchLocationId,
    routeName: "Factory to Route 01",
    routeDescription: "Truck sale trip test",
    status: "PLANNED",
    isActive: true,
  });

  const created = await createPostedSale(
    {
      saleDate: new Date().toISOString(),
      locationId: context.factoryLocationId,
      channel: "TRUCK",
      truckId: vehicle.id,
      tripId: trip.id,
      routeName: "Factory to Route 01",
      paymentMethod: "CASH",
      lines: [{ itemId: context.fgItemId, quantity: 2 }],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  const sale = await getSaleById(created.id);

  assert.equal(created.channel, "TRUCK");
  assert.equal(sale?.channel, "TRUCK");
  assert.equal(sale?.truckId, vehicle.id);
  assert.equal(sale?.tripId, trip.id);
  assert.equal(sale?.routeName, "Factory to Route 01");
  assert.equal(sale?.truckLabel?.includes(vehicle.vehicleCode), true);
  assert.equal(sale?.tripLabel?.includes(trip.tripNo), true);
  assert.equal(Number(sale?.items[0]?.unitPrice ?? 0), 211);

  await archiveFleetTrip(trip.id);
  await archiveVehicle(vehicle.id);
  await archiveSalesArtifacts(context);
});

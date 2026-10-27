import assert from "node:assert/strict";
import { after, test } from "node:test";

import { sql } from "@/lib/db";
import {
  archiveFleetDriver,
  archiveFleetTrip,
  archiveVehicle,
  createFleetDriver,
  createFleetTrip,
  createVehicle,
} from "@/services/fleet/fleet.service";
import {
  createLoadingOrder,
  getLoadingOrderById,
} from "@/services/sales/loading-order.service";

import {
  archiveSalesArtifacts,
  closeTestDatabase,
  createSalesTestContext,
} from "./_helpers";

after(closeTestDatabase);

async function getPriceListItemId(priceListId: string, itemId: string) {
  const rows = await sql<Array<{ id: string }>>`
    SELECT id
    FROM "PriceListItem"
    WHERE "priceListId" = ${priceListId}
      AND "itemId" = ${itemId}
      AND "isArchived" = false
    LIMIT 1
  `;

  if (!rows[0]) {
    throw new Error("Price list item not found for loading trip test");
  }

  return rows[0].id;
}

async function archiveLoadingArtifacts(loadingId: string) {
  await sql`
    UPDATE "StockReservation"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE "sourceType" = 'sales.loading'
      AND "sourceId" = ${loadingId}
  `;

  await sql`
    UPDATE "LoadingOrder"
    SET "isArchived" = true, "updatedAt" = NOW()
    WHERE id = ${loadingId}
  `;
}

test("truck loading can inherit truck, driver, and route from a real fleet trip", async () => {
  const context = await createSalesTestContext();
  const priceListItemId = await getPriceListItemId(context.priceListId, context.fgItemId);

  const vehicle = await createVehicle({
    vehicleCode: `TRK-${Date.now()}`,
    plateNumber: `AA-${Date.now().toString().slice(-4)}`,
    vehicleName: "Sales Trip Truck",
    vehicleType: "TRUCK",
    capacity: 1200,
    isActive: true,
  });

  const driver = await createFleetDriver({
    driverCode: `DRV-${Date.now()}`,
    fullName: "Sales Trip Driver",
    phone: "0911000000",
    licenseNumber: `LIC-${Date.now()}`,
    isActive: true,
  });

  const trip = await createFleetTrip({
    tripNo: `TRIP-${Date.now()}`,
    tripDate: new Date().toISOString(),
    vehicleId: vehicle.id,
    driverId: driver.id,
    fromLocationId: context.factoryLocationId,
    destinationId: context.branchLocationId,
    routeName: "Factory to Branch Route",
    routeDescription: "Trip-linked loading test",
    status: "PLANNED",
    isActive: true,
  });

  const created = await createLoadingOrder(
    {
      loadingDate: new Date().toISOString(),
      channel: "TRUCK",
      fromLocationId: context.factoryLocationId,
      destinationLocationId: context.branchLocationId,
      tripId: trip.id,
      status: "DRAFT",
      lines: [
        {
          itemId: context.fgItemId,
          unitId: context.unitId,
          priceListId: context.priceListId,
          priceListItemId,
          quantity: 2,
          unitPrice: 155,
          lineTotal: 310,
        },
      ],
    },
    {
      userId: context.userId,
      userName: context.userName,
    },
  );

  const loading = await getLoadingOrderById(created.id);

  assert.equal(loading?.channel, "TRUCK");
  assert.equal(loading?.tripId, trip.id);
  assert.equal(loading?.tripLabel?.includes(trip.tripNo), true);
  assert.equal(loading?.truckLabel?.includes(vehicle.vehicleCode), true);
  assert.equal(loading?.driverName?.includes(driver.driverCode), true);
  assert.equal(loading?.routeName, trip.routeName);

  await archiveLoadingArtifacts(created.id);
  await archiveFleetTrip(trip.id);
  await archiveFleetDriver(driver.id);
  await archiveVehicle(vehicle.id);
  await archiveSalesArtifacts(context);
});

import assert from "node:assert/strict";
import test from "node:test";

import { summarizeFleetTripReconciliation } from "@/services/fleet/fleet-reconciliation.service";

test("trip reconciliation flags partial and variance states correctly", () => {
  const partial = summarizeFleetTripReconciliation({
    loadingQuantity: 100,
    dispatchQuantity: 80,
    soldQuantity: 55,
    fuelCost: 1200,
    distance: 300,
    expectedCollection: 5000,
    actualCollection: 5000,
    creditSales: 1500,
  });

  assert.equal(partial.status, "PENDING");
  assert.equal(partial.undispatchedQuantity, 20);
  assert.equal(partial.unsoldQuantity, 25);
  assert.equal(partial.overDispatchedQuantity, 0);
  assert.equal(partial.overSoldQuantity, 0);
  assert.equal(partial.dispatchCompletionPercent, 80);
  assert.equal(partial.salesCompletionPercent, 68.75);
  assert.equal(partial.fuelCostPerKm, 4);
  assert.equal(partial.paymentVariance, 0);
  assert.equal(partial.creditSales, 1500);

  const variance = summarizeFleetTripReconciliation({
    loadingQuantity: 70,
    dispatchQuantity: 75,
    soldQuantity: 80,
    fuelCost: 800,
    distance: 160,
    expectedCollection: 4000,
    actualCollection: 3700,
  });

  assert.equal(variance.status, "VARIANCE");
  assert.equal(variance.overDispatchedQuantity, 5);
  assert.equal(variance.overSoldQuantity, 5);
  assert.equal(variance.fuelCostPerSoldUnit, 10);
  assert.equal(variance.paymentVariance, -300);
});

test("trip reconciliation flags a payment-only variance", () => {
  const summary = summarizeFleetTripReconciliation({
    loadingQuantity: 40,
    dispatchQuantity: 40,
    soldQuantity: 40,
    expectedCollection: 2500,
    actualCollection: 2400,
  });

  assert.equal(summary.status, "VARIANCE");
  assert.equal(summary.paymentVariance, -100);
});

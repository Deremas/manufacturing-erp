export interface FleetTripReconciliationInput {
  loadingQuantity?: number | null;
  dispatchQuantity?: number | null;
  soldQuantity?: number | null;
  fuelCost?: number | null;
  distance?: number | null;
  expectedCollection?: number | null;
  actualCollection?: number | null;
  creditSales?: number | null;
}

export interface FleetTripReconciliationSummary {
  loadingQuantity: number;
  dispatchQuantity: number;
  soldQuantity: number;
  fuelCost: number;
  distance: number;
  expectedCollection: number;
  actualCollection: number;
  creditSales: number;
  paymentVariance: number;
  undispatchedQuantity: number;
  unsoldQuantity: number;
  overDispatchedQuantity: number;
  overSoldQuantity: number;
  dispatchCompletionPercent: number;
  salesCompletionPercent: number;
  fuelCostPerKm: number | null;
  fuelCostPerSoldUnit: number | null;
  status: "CLEAR" | "PENDING" | "VARIANCE";
}

function normalizeMetric(value: number | null | undefined) {
  const numeric = Number(value ?? 0);
  return Number.isFinite(numeric) ? numeric : 0;
}

function toPercent(numerator: number, denominator: number) {
  if (!(denominator > 0)) {
    return 0;
  }

  return Math.max(0, Math.min(100, Number(((numerator / denominator) * 100).toFixed(2))));
}

export function summarizeFleetTripReconciliation(
  input: FleetTripReconciliationInput,
): FleetTripReconciliationSummary {
  const loadingQuantity = normalizeMetric(input.loadingQuantity);
  const dispatchQuantity = normalizeMetric(input.dispatchQuantity);
  const soldQuantity = normalizeMetric(input.soldQuantity);
  const fuelCost = normalizeMetric(input.fuelCost);
  const distance = normalizeMetric(input.distance);
  const expectedCollection = normalizeMetric(input.expectedCollection);
  const actualCollection = normalizeMetric(input.actualCollection);
  const creditSales = normalizeMetric(input.creditSales);
  const paymentVariance = Number((actualCollection - expectedCollection).toFixed(2));

  const undispatchedQuantity = Math.max(loadingQuantity - dispatchQuantity, 0);
  const unsoldQuantity = Math.max(dispatchQuantity - soldQuantity, 0);
  const overDispatchedQuantity = Math.max(dispatchQuantity - loadingQuantity, 0);
  const overSoldQuantity = Math.max(soldQuantity - dispatchQuantity, 0);

  let status: FleetTripReconciliationSummary["status"] = "CLEAR";
  if (overDispatchedQuantity > 0 || overSoldQuantity > 0 || Math.abs(paymentVariance) > 0.01) {
    status = "VARIANCE";
  } else if (undispatchedQuantity > 0 || unsoldQuantity > 0) {
    status = "PENDING";
  }

  return {
    loadingQuantity,
    dispatchQuantity,
    soldQuantity,
    fuelCost,
    distance,
    expectedCollection,
    actualCollection,
    creditSales,
    paymentVariance,
    undispatchedQuantity,
    unsoldQuantity,
    overDispatchedQuantity,
    overSoldQuantity,
    dispatchCompletionPercent: toPercent(dispatchQuantity, loadingQuantity),
    salesCompletionPercent: toPercent(soldQuantity, dispatchQuantity),
    fuelCostPerKm: distance > 0 ? Number((fuelCost / distance).toFixed(4)) : null,
    fuelCostPerSoldUnit: soldQuantity > 0 ? Number((fuelCost / soldQuantity).toFixed(4)) : null,
    status,
  };
}

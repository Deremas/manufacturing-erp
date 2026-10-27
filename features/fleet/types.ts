export interface Vehicle {
  id: string;
  vehicleCode: string;
  plateNumber: string;
  vehicleName: string;
  vehicleType?: string;
  capacity?: number;
  isActive: boolean;
}

export interface FleetDriver {
  id: string;
  driverCode: string;
  fullName: string;
  phone?: string;
  licenseNumber?: string;
  isActive: boolean;
}

export interface FleetTrip {
  id: string;
  publicId: number;
  tripNo: string;
  tripDate: string;
  vehicleId: string;
  vehicleCode?: string;
  vehicleName?: string;
  plateNumber?: string;
  driverId?: string;
  driverCode?: string;
  driverName?: string;
  fromLocationId?: string;
  fromLocationLabel?: string;
  destinationId?: string;
  destinationLabel?: string;
  routeName: string;
  routeDescription?: string;
  plannedDeparture?: string;
  actualDeparture?: string;
  plannedArrival?: string;
  actualArrival?: string;
  openingOdometer?: number;
  closingOdometer?: number;
  distance?: number;
  deliveryRemarks?: string;
  status: string;
  reconciliationDecision?: "MARK_VARIANCE_EXPLAINED" | "MARK_SHORTAGE" | "MARK_OVER_DELIVERY" | "CLOSE_WITH_EXCEPTION";
  reconciliationNote?: string;
  reconciledAt?: string;
  reconciledById?: string;
  remarks?: string;
  isActive: boolean;
  loadingCount?: number;
  loadingQuantity?: number;
  dispatchCount?: number;
  dispatchQuantity?: number;
  saleCount?: number;
  soldQuantity?: number;
  soldAmount?: number;
  expectedCollection?: number;
  actualCollection?: number;
  creditSales?: number;
  paymentVariance?: number;
  fuelRecordCount?: number;
  fuelQuantity?: number;
  fuelCost?: number;
  undispatchedQuantity?: number;
  unsoldQuantity?: number;
  overDispatchedQuantity?: number;
  overSoldQuantity?: number;
  dispatchCompletionPercent?: number;
  salesCompletionPercent?: number;
  fuelCostPerKm?: number;
  fuelCostPerSoldUnit?: number;
  reconciliationStatus?: "CLEAR" | "PENDING" | "VARIANCE";
}

export interface FuelRecord {
  id: string;
  fuelNo: string;
  fuelDate: string;
  vehicleId: string;
  vehicleLabel?: string;
  driverId?: string;
  driverLabel?: string;
  tripId?: string;
  tripLabel?: string;
  locationId?: string;
  locationLabel?: string;
  fuelType: string;
  quantity: number;
  unitPrice: number;
  totalCost: number;
  odometer?: number;
  supplierId?: string;
  supplierLabel?: string;
  bankAccountId?: string;
  bankAccountLabel?: string;
  status: string;
  remarks?: string;
  postedAt?: string;
}

export interface CommonReportFilters {
  dateFrom?: string | null;
  dateTo?: string | null;
  locationId?: string | null;
  departmentId?: string | null;
  status?: string | null;
  itemId?: string | null;
  categoryId?: string | null;
  itemTypeId?: string | null;
  customerId?: string | null;
  supplierId?: string | null;
  userId?: string | null;
  shift?: string | null;
  channel?: string | null;
  vehicleId?: string | null;
  driverId?: string | null;
  reportType?: string | null;
}

export function normalizeReportQueryValue(
  value: string | string[] | undefined,
): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export function parseCommonReportFilters(
  searchParams: Record<string, string | string[] | undefined>,
): CommonReportFilters {
  return {
    dateFrom: normalizeReportQueryValue(searchParams.dateFrom),
    dateTo: normalizeReportQueryValue(searchParams.dateTo),
    locationId: normalizeReportQueryValue(searchParams.locationId),
    departmentId: normalizeReportQueryValue(searchParams.departmentId),
    status: normalizeReportQueryValue(searchParams.status),
    itemId: normalizeReportQueryValue(searchParams.itemId),
    categoryId: normalizeReportQueryValue(searchParams.categoryId),
    itemTypeId: normalizeReportQueryValue(searchParams.itemTypeId),
    customerId: normalizeReportQueryValue(searchParams.customerId),
    supplierId: normalizeReportQueryValue(searchParams.supplierId),
    userId: normalizeReportQueryValue(searchParams.userId),
    shift: normalizeReportQueryValue(searchParams.shift),
    channel: normalizeReportQueryValue(searchParams.channel),
    vehicleId: normalizeReportQueryValue(searchParams.vehicleId),
    driverId: normalizeReportQueryValue(searchParams.driverId),
    reportType: normalizeReportQueryValue(searchParams.reportType),
  };
}

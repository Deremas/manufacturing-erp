import type {
  MaintenanceAssetRegisterRow,
  MaintenanceDowntimeReportRow,
  MaintenanceSpareUsageReportRow,
  MaintenanceTicketReportRow,
  MaintenanceWorkOrderReportRow,
  PreventiveMaintenanceReportRow,
} from "@/services/reports/maintenance-report.service";
import {
  getMaintenanceAssetRegisterReport,
  getMaintenanceDowntimeReport,
  getMaintenanceOpenTicketsReport,
  getMaintenanceSparePartsUsageReport,
  getMaintenanceWorkOrdersReport,
  getPreventiveMaintenanceReport,
} from "@/services/reports/maintenance-report.service";
import { getReliabilityRows, type ReliabilityRow } from "@/services/maintenance/reliability.service";

type MaintenanceScope = {
  accessibleLocationIds?: string[] | null;
};

export interface MaintenanceDashboardSummary {
  assetCount: number;
  underMaintenanceCount: number;
  openTicketCount: number;
  activeWorkOrderCount: number;
  pmDueCount: number;
  pmOverdueCount: number;
  downtimeMinutes: number;
  maintenanceCost: number;
  spareUsageCost: number;
  machinesDownCount: number;
  mttrHours: number;
  mtbfHours: number;
  recentWorkOrders: MaintenanceWorkOrderReportRow[];
  recentTickets: MaintenanceTicketReportRow[];
  machinesDown: MaintenanceAssetRegisterRow[];
  criticalWorkOrders: MaintenanceWorkOrderReportRow[];
  overdueWorkOrders: MaintenanceWorkOrderReportRow[];
  pmDueSoon: PreventiveMaintenanceReportRow[];
  todaysDowntime: MaintenanceDowntimeReportRow[];
  highestCostAssets: Array<{ assetId: string; assetCode: string | null; assetName: string | null; totalCost: number }>;
  highestDowntimeAssets: Array<{ assetId: string; assetCode: string | null; assetName: string | null; downtimeMinutes: number }>;
}

export function summarizeMaintenanceDashboardData(input: {
  assets: MaintenanceAssetRegisterRow[];
  workOrders: MaintenanceWorkOrderReportRow[];
  tickets: MaintenanceTicketReportRow[];
  preventivePlans: PreventiveMaintenanceReportRow[];
  downtimeRows: MaintenanceDowntimeReportRow[];
  spareUsageRows: MaintenanceSpareUsageReportRow[];
  reliabilityRows?: ReliabilityRow[];
  today?: Date;
}): MaintenanceDashboardSummary {
  const today = input.today ?? new Date();
  const todayKey = new Date(today.toISOString().slice(0, 10));

  const pmDueCount = input.preventivePlans.filter((plan) => Boolean(plan.nextDueDate)).length;
  const pmOverdueCount = input.preventivePlans.filter((plan) => {
    if (!plan.nextDueDate) {
      return false;
    }

    const due = new Date(plan.nextDueDate);
    return !Number.isNaN(due.getTime()) && due < todayKey;
  }).length;

  const maintenanceCost = input.workOrders.reduce((sum, row) => sum + Number(row.totalCost ?? 0), 0);
  const spareUsageCost = input.spareUsageRows.reduce((sum, row) => sum + Number(row.totalCost ?? 0), 0);
  const downtimeMinutes = input.downtimeRows.reduce((sum, row) => sum + Number(row.durationMinutes ?? 0), 0);
  const failures = (input.reliabilityRows ?? []).reduce((sum, row) => sum + Number(row.breakdownCount), 0);
  const activeStatuses = ["APPROVED", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_EXTERNAL_SERVICE", "TESTED"];
  const machinesDown = input.assets.filter((asset) => ["UNDER_MAINTENANCE", "OUT_OF_SERVICE"].includes(asset.status));
  const costByAsset = new Map<string, { assetId: string; assetCode: string | null; assetName: string | null; totalCost: number }>();
  for (const order of input.workOrders) {
    const current = costByAsset.get(order.assetId) ?? { assetId: order.assetId, assetCode: order.assetCode, assetName: order.assetName, totalCost: 0 };
    current.totalCost += Number(order.totalCost ?? 0);
    costByAsset.set(order.assetId, current);
  }
  const downtimeByAsset = new Map<string, { assetId: string; assetCode: string | null; assetName: string | null; downtimeMinutes: number }>();
  for (const row of input.downtimeRows) {
    if (!row.assetId) continue;
    const current = downtimeByAsset.get(row.assetId) ?? { assetId: row.assetId, assetCode: row.assetCode, assetName: row.assetName, downtimeMinutes: 0 };
    current.downtimeMinutes += Number(row.durationMinutes ?? 0);
    downtimeByAsset.set(row.assetId, current);
  }
  const todayIso = today.toISOString().slice(0, 10);

  return {
    assetCount: input.assets.length,
    underMaintenanceCount: input.assets.filter((asset) => asset.status === "UNDER_MAINTENANCE").length,
    openTicketCount: input.tickets.length,
    activeWorkOrderCount: input.workOrders.filter((order) => activeStatuses.includes(order.status)).length,
    pmDueCount,
    pmOverdueCount,
    downtimeMinutes,
    maintenanceCost,
    spareUsageCost,
    machinesDownCount: machinesDown.length,
    mttrHours: failures ? (input.reliabilityRows ?? []).reduce((sum, row) => sum + Number(row.mttrHours) * Number(row.breakdownCount), 0) / failures : 0,
    mtbfHours: failures ? (input.reliabilityRows ?? []).reduce((sum, row) => sum + Number(row.operatingHours), 0) / failures : 0,
    recentWorkOrders: input.workOrders.slice(0, 5),
    recentTickets: input.tickets.slice(0, 5),
    machinesDown: machinesDown.slice(0, 8),
    criticalWorkOrders: input.workOrders.filter((order) => activeStatuses.includes(order.status) && ["CRITICAL", "HIGH"].includes(order.priority)).slice(0, 8),
    overdueWorkOrders: input.workOrders.filter((order) => {
      if (!activeStatuses.includes(order.status) || !order.scheduledStart) return false;
      const scheduled = new Date(order.scheduledStart);
      return !Number.isNaN(scheduled.getTime()) && scheduled < todayKey;
    }).slice(0, 8),
    pmDueSoon: input.preventivePlans.filter((plan) => {
      if (!plan.nextDueDate) return false;
      const due = new Date(plan.nextDueDate);
      if (Number.isNaN(due.getTime())) return false;
      const horizon = new Date(todayKey);
      horizon.setDate(horizon.getDate() + 7);
      return due <= horizon;
    }).slice(0, 8),
    todaysDowntime: input.downtimeRows.filter((row) => String(row.productionDate ?? row.startTime ?? "").slice(0, 10) === todayIso).slice(0, 8),
    highestCostAssets: [...costByAsset.values()].sort((left, right) => right.totalCost - left.totalCost).slice(0, 5),
    highestDowntimeAssets: [...downtimeByAsset.values()].sort((left, right) => right.downtimeMinutes - left.downtimeMinutes).slice(0, 5),
  };
}

export async function getMaintenanceDashboardSummary(
  scope: MaintenanceScope = {},
): Promise<MaintenanceDashboardSummary> {
  const [assets, workOrders, tickets, preventivePlans, downtimeRows, spareUsageRows, reliabilityRows] = await Promise.all([
    getMaintenanceAssetRegisterReport(scope),
    getMaintenanceWorkOrdersReport(scope),
    getMaintenanceOpenTicketsReport(scope),
    getPreventiveMaintenanceReport(scope),
    getMaintenanceDowntimeReport(scope),
    getMaintenanceSparePartsUsageReport(scope),
    getReliabilityRows(scope),
  ]);

  return summarizeMaintenanceDashboardData({
    assets,
    workOrders,
    tickets,
    preventivePlans,
    downtimeRows,
    spareUsageRows,
    reliabilityRows,
  });
}

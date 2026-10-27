import assert from "node:assert/strict";
import test from "node:test";

import { summarizeMaintenanceDashboardData } from "@/services/maintenance/maintenance-dashboard.service";

test("maintenance dashboard summary rolls up scoped KPI totals", () => {
  const summary = summarizeMaintenanceDashboardData({
    today: new Date("2026-07-14T00:00:00.000Z"),
    assets: [
      {
        id: "asset-1",
        assetCode: "AST-001",
        assetName: "Line 1 Filler",
        assetType: "MCH - Machine",
        locationName: "Factory",
        departmentName: "Production",
        status: "UNDER_MAINTENANCE",
        criticality: "HIGH",
        lastMaintenanceDate: null,
        nextPmDueDate: "2026-07-10",
      },
      {
        id: "asset-2",
        assetCode: "AST-002",
        assetName: "Compressor",
        assetType: "MCH - Machine",
        locationName: "Factory",
        departmentName: "Utilities",
        status: "ACTIVE",
        criticality: "MEDIUM",
        lastMaintenanceDate: null,
        nextPmDueDate: "2026-07-20",
      },
    ],
    workOrders: [
      {
        id: "wo-1",
        workOrderNo: "WO-001",
        ticketNo: "MT-001",
        assetId: "asset-1",
        assetCode: "AST-001",
        assetName: "Line 1 Filler",
        locationName: "Factory",
        workType: "CORRECTIVE",
        priority: "HIGH",
        assignedTechnicianName: "Tech One",
        scheduledStart: "2026-07-12",
        actualEnd: null,
        status: "IN_PROGRESS",
        totalCost: 2400,
      },
      {
        id: "wo-2",
        workOrderNo: "WO-002",
        ticketNo: "MT-002",
        assetId: "asset-2",
        assetCode: "AST-002",
        assetName: "Compressor",
        locationName: "Factory",
        workType: "PM",
        priority: "MEDIUM",
        assignedTechnicianName: "Tech Two",
        scheduledStart: "2026-07-13",
        actualEnd: "2026-07-13",
        status: "COMPLETED",
        totalCost: 600,
      },
    ],
    tickets: [
      {
        id: "ticket-1",
        ticketNo: "MT-001",
        assetId: "asset-1",
        assetCode: "AST-001",
        assetName: "Line 1 Filler",
        locationName: "Factory",
        type: "BREAKDOWN",
        priority: "HIGH",
        requestDate: "2026-07-12",
        targetCompletionDate: null,
        actualCompletionDate: null,
        requestedByName: "Planner",
        assignedToName: "Tech One",
        productionDowntimeId: null,
        status: "IN_PROGRESS",
      },
    ],
    preventivePlans: [
      {
        id: "pm-1",
        planNo: "PM-001",
        assetId: "asset-1",
        assetCode: "AST-001",
        assetName: "Line 1 Filler",
        locationName: "Factory",
        title: "Weekly PM",
        maintenanceType: "PM",
        frequencyType: "WEEKLY",
        frequencyValue: 1,
        nextDueDate: "2026-07-10",
        lastCompletedDate: null,
        status: "ACTIVE",
      },
      {
        id: "pm-2",
        planNo: "PM-002",
        assetId: "asset-2",
        assetCode: "AST-002",
        assetName: "Compressor",
        locationName: "Factory",
        title: "Monthly PM",
        maintenanceType: "PM",
        frequencyType: "MONTHLY",
        frequencyValue: 1,
        nextDueDate: "2026-07-20",
        lastCompletedDate: null,
        status: "ACTIVE",
      },
    ],
    downtimeRows: [
      {
        ticketId: "ticket-1",
        ticketNo: "MT-001",
        downtimeId: "dt-1",
        assetId: "asset-1",
        assetCode: "AST-001",
        assetName: "Line 1 Filler",
        locationName: "Factory",
        shiftSessionId: "shift-1",
        productionDate: "2026-07-12",
        reason: "BREAKDOWN",
        machine: "Line 1",
        startTime: "2026-07-12T08:00:00.000Z",
        endTime: "2026-07-12T09:00:00.000Z",
        durationMinutes: 60,
        status: "IN_PROGRESS",
      },
    ],
    spareUsageRows: [
      {
        partId: "part-1",
        workOrderId: "wo-1",
        workOrderNo: "WO-001",
        assetId: "asset-1",
        assetCode: "AST-001",
        assetName: "Line 1 Filler",
        locationName: "Factory",
        itemId: "item-1",
        itemCode: "SP-001",
        itemName: "Seal Kit",
        uomName: "PCS - Piece",
        requestedQty: 2,
        issuedQty: 2,
        usedQty: 2,
        returnedQty: 0,
        damagedQty: 0,
        directIssue: false,
        unitCost: 150,
        totalCost: 300,
        status: "IN_PROGRESS",
        scheduledStart: "2026-07-12",
      },
    ],
  });

  assert.equal(summary.assetCount, 2);
  assert.equal(summary.underMaintenanceCount, 1);
  assert.equal(summary.openTicketCount, 1);
  assert.equal(summary.activeWorkOrderCount, 1);
  assert.equal(summary.pmDueCount, 2);
  assert.equal(summary.pmOverdueCount, 1);
  assert.equal(summary.downtimeMinutes, 60);
  assert.equal(summary.maintenanceCost, 3000);
  assert.equal(summary.spareUsageCost, 300);
  assert.equal(summary.recentWorkOrders.length, 2);
  assert.equal(summary.recentTickets.length, 1);
  assert.equal(summary.machinesDown.length, 1);
  assert.equal(summary.criticalWorkOrders.length, 1);
  assert.equal(summary.pmDueSoon.length, 2);
});

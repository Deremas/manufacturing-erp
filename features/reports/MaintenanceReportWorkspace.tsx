"use client";

import { Eye, History, Printer } from "lucide-react";
import { useRouter } from "next/navigation";

import {
  ReportEmptyState,
  ReportExportActions,
  ReportHeader,
  ReportKpiGrid,
  ReportPageShell,
  ReportTable,
} from "@/components/reporting";
import type { Breadcrumb, Column, TableAction } from "@/components/shared";
import MaintenanceReportFilters from "@/features/reports/MaintenanceReportFilters";
import type {
  MaintenanceAssetCostReportRow,
  MaintenanceAssetRegisterRow,
  MaintenanceDepartmentCostRow,
  MaintenanceDowntimeReportRow,
  MaintenanceRepeatFailureRow,
  MaintenanceSpareUsageReportRow,
  MaintenanceTicketReportRow,
  MaintenanceWarrantyExpiryRow,
  MaintenanceWorkOrderReportRow,
  PreventiveMaintenanceReportRow,
} from "@/services/reports/maintenance-report.service";
import { formatMoney } from "@/lib/utils/format-number";

type ReportKey =
  | "asset-register"
  | "work-orders"
  | "open-work-orders"
  | "overdue-work-orders"
  | "breakdowns"
  | "preventive-maintenance"
  | "pm-compliance"
  | "downtime"
  | "spare-parts-usage"
  | "spare-damage"
  | "direct-issues"
  | "asset-maintenance-cost"
  | "department-cost"
  | "warranty-expiry"
  | "repeat-failures"
  | "open-tickets";

type Row =
  | MaintenanceAssetRegisterRow
  | MaintenanceWorkOrderReportRow
  | MaintenanceTicketReportRow
  | PreventiveMaintenanceReportRow
  | MaintenanceDowntimeReportRow
  | MaintenanceSpareUsageReportRow
  | MaintenanceAssetCostReportRow
  | MaintenanceWarrantyExpiryRow
  | MaintenanceDepartmentCostRow
  | MaintenanceRepeatFailureRow;

function formatDate(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleDateString("en-KE");
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "-";
  return new Date(value).toLocaleString("en-KE", { dateStyle: "medium", timeStyle: "short" });
}

function buildExportRows(reportKey: ReportKey, rows: Row[]) {
  switch (reportKey) {
    case "asset-register":
      return (rows as MaintenanceAssetRegisterRow[]).map((row) => ({
        assetCode: row.assetCode,
        assetName: row.assetName,
        assetType: row.assetType,
        location: row.locationName,
        department: row.departmentName,
        status: row.status,
        criticality: row.criticality,
        lastMaintenanceDate: row.lastMaintenanceDate,
        nextPmDueDate: row.nextPmDueDate,
      }));
    case "work-orders":
    case "open-work-orders":
    case "overdue-work-orders":
      return (rows as MaintenanceWorkOrderReportRow[]).map((row) => ({
        workOrderNo: row.workOrderNo,
        ticketNo: row.ticketNo,
        assetCode: row.assetCode,
        assetName: row.assetName,
        location: row.locationName,
        workType: row.workType,
        priority: row.priority,
        technician: row.assignedTechnicianName,
        scheduledStart: row.scheduledStart,
        actualEnd: row.actualEnd,
        status: row.status,
        totalCost: row.totalCost,
      }));
    case "breakdowns":
    case "open-tickets":
      return (rows as MaintenanceTicketReportRow[]).map((row) => ({
        ticketNo: row.ticketNo,
        assetCode: row.assetCode,
        assetName: row.assetName,
        location: row.locationName,
        type: row.type,
        priority: row.priority,
        requestDate: row.requestDate,
        targetCompletionDate: row.targetCompletionDate,
        actualCompletionDate: row.actualCompletionDate,
        requestedBy: row.requestedByName,
        assignedTo: row.assignedToName,
        status: row.status,
      }));
    case "preventive-maintenance":
    case "pm-compliance":
      return (rows as PreventiveMaintenanceReportRow[]).map((row) => ({
        planNo: row.planNo,
        assetCode: row.assetCode,
        assetName: row.assetName,
        location: row.locationName,
        title: row.title,
        maintenanceType: row.maintenanceType,
        frequencyType: row.frequencyType,
        frequencyValue: row.frequencyValue,
        nextDueDate: row.nextDueDate,
        lastCompletedDate: row.lastCompletedDate,
        status: row.status,
      }));
    case "downtime":
      return (rows as MaintenanceDowntimeReportRow[]).map((row) => ({
        ticketNo: row.ticketNo,
        assetCode: row.assetCode,
        assetName: row.assetName,
        location: row.locationName,
        productionDate: row.productionDate,
        reason: row.reason,
        machine: row.machine,
        startTime: row.startTime,
        endTime: row.endTime,
        durationMinutes: row.durationMinutes,
        status: row.status,
      }));
    case "spare-parts-usage":
    case "spare-damage":
    case "direct-issues":
      return (rows as MaintenanceSpareUsageReportRow[]).map((row) => ({
        workOrderNo: row.workOrderNo,
        assetCode: row.assetCode,
        assetName: row.assetName,
        itemCode: row.itemCode,
        itemName: row.itemName,
        uom: row.uomName,
        requestedQty: row.requestedQty,
        issuedQty: row.issuedQty,
        usedQty: row.usedQty,
        returnedQty: row.returnedQty,
        damagedQty: row.damagedQty,
        directIssue: row.directIssue,
        unitCost: row.unitCost,
        totalCost: row.totalCost,
        status: row.status,
      }));
    case "asset-maintenance-cost":
      return (rows as MaintenanceAssetCostReportRow[]).map((row) => ({
        assetCode: row.assetCode,
        assetName: row.assetName,
        location: row.locationName,
        workOrderCount: row.workOrderCount,
        spareCost: row.spareCost,
        laborCost: row.laborCost,
        externalCost: row.externalCost,
        totalCost: row.totalCost,
        lastCompletionDate: row.lastCompletionDate,
      }));
    case "warranty-expiry":
      return (rows as MaintenanceWarrantyExpiryRow[]).map((row) => ({
        assetCode: row.assetCode,
        assetName: row.assetName,
        location: row.locationName,
        warrantyEnd: row.warrantyEnd,
        daysRemaining: row.daysRemaining,
        status: row.status,
      }));
    case "department-cost":
      return (rows as MaintenanceDepartmentCostRow[]).map((row) => ({
        department: row.departmentName,
        workOrderCount: row.workOrderCount,
        spareCost: row.spareCost,
        laborCost: row.laborCost,
        externalCost: row.externalCost,
        totalCost: row.totalCost,
      }));
    case "repeat-failures":
      return (rows as MaintenanceRepeatFailureRow[]).map((row) => ({
        assetCode: row.assetCode,
        assetName: row.assetName,
        location: row.locationName,
        breakdownCount: row.breakdownCount,
        lastFailureDate: row.lastFailureDate,
        status: row.status,
      }));
    default:
      return [];
  }
}

export default function MaintenanceReportWorkspace({
  reportKey,
  rows,
  assets,
  locations,
  refreshedAt,
}: {
  reportKey: ReportKey;
  rows: Row[];
  assets: Array<{ value: string; label: string }>;
  locations: Array<{ value: string; label: string }>;
  refreshedAt: string;
}) {
  const router = useRouter();
  const breadcrumbs: Breadcrumb[] = [{ label: "Reports", href: "/reports" }, { label: "Maintenance" }];

  const configs = {
    "asset-register": {
      title: "Maintenance Asset Register",
      subtitle: "Asset ownership, maintenance lifecycle, and preventive due visibility.",
      statusOptions: ["ACTIVE", "UNDER_MAINTENANCE", "OUT_OF_SERVICE", "RETIRED", "DISPOSED"],
      columns: [
        { key: "assetCode", label: "Asset Code" },
        { key: "assetName", label: "Asset Name" },
        { key: "assetType", label: "Asset Type" },
        { key: "locationName", label: "Location", render: (value: unknown) => value ?? "-" },
        { key: "departmentName", label: "Department", render: (value: unknown) => value ?? "-" },
        { key: "criticality", label: "Criticality" },
        { key: "status", label: "Status" },
        { key: "lastMaintenanceDate", label: "Last Maintenance", render: (value: unknown) => formatDate(value as string | null) },
        { key: "nextPmDueDate", label: "Next PM Due", render: (value: unknown) => formatDate(value as string | null) },
      ] satisfies Column<MaintenanceAssetRegisterRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: MaintenanceAssetRegisterRow) => router.push(`/assets/${record.id}`) },
        { label: "History", icon: <History size={16} />, onClick: (record: MaintenanceAssetRegisterRow) => router.push(`/assets/${record.id}/history`) },
      ] satisfies TableAction[],
      kpis: (typedRows: MaintenanceAssetRegisterRow[]) => [
        { label: "Assets", value: typedRows.length },
        { label: "Under Maintenance", value: typedRows.filter((row) => row.status === "UNDER_MAINTENANCE").length },
        { label: "PM Due", value: typedRows.filter((row) => !!row.nextPmDueDate).length },
      ],
    },
    "work-orders": {
      title: "Maintenance Work Orders",
      subtitle: "Execution, labor, spare usage, and total maintenance cost visibility.",
      statusOptions: ["DRAFT", "SUBMITTED", "APPROVED", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_EXTERNAL_SERVICE", "COMPLETED", "TESTED", "CLOSED", "CANCELLED", "REJECTED"],
      columns: [
        { key: "workOrderNo", label: "Work Order No" },
        { key: "ticketNo", label: "Ticket", render: (value: unknown) => value ?? "-" },
        { key: "assetCode", label: "Asset Code", render: (value: unknown) => value ?? "-" },
        { key: "assetName", label: "Asset" },
        { key: "locationName", label: "Location", render: (value: unknown) => value ?? "-" },
        { key: "workType", label: "Work Type" },
        { key: "priority", label: "Priority" },
        { key: "assignedTechnicianName", label: "Technician", render: (value: unknown) => value ?? "-" },
        { key: "scheduledStart", label: "Scheduled", render: (value: unknown) => formatDate(value as string | null) },
        { key: "actualEnd", label: "Completed", render: (value: unknown) => formatDate(value as string | null) },
        { key: "status", label: "Status" },
        { key: "totalCost", label: "Total Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
      ] satisfies Column<MaintenanceWorkOrderReportRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: MaintenanceWorkOrderReportRow) => router.push(`/maintenance/work-orders/${record.id}`) },
        { label: "Print", icon: <Printer size={16} />, onClick: (record: MaintenanceWorkOrderReportRow) => router.push(`/maintenance/work-orders/${record.id}/print`) },
      ] satisfies TableAction[],
      kpis: (typedRows: MaintenanceWorkOrderReportRow[]) => [
        { label: "Work Orders", value: typedRows.length },
        { label: "In Progress", value: typedRows.filter((row) => row.status === "IN_PROGRESS").length },
        { label: "Total Cost", value: formatMoney(typedRows.reduce((sum, row) => sum + Number(row.totalCost ?? 0), 0)) },
      ],
    },
    "open-work-orders": {
      title: "Open Work Orders",
      subtitle: "Work orders that are still assigned, in progress, or waiting for parts or service.",
      statusOptions: ["DRAFT", "SUBMITTED", "APPROVED", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_EXTERNAL_SERVICE", "COMPLETED", "TESTED"],
      columns: [
        { key: "workOrderNo", label: "Work Order No" },
        { key: "ticketNo", label: "Ticket", render: (value: unknown) => value ?? "-" },
        { key: "assetCode", label: "Asset Code", render: (value: unknown) => value ?? "-" },
        { key: "assetName", label: "Asset" },
        { key: "locationName", label: "Location", render: (value: unknown) => value ?? "-" },
        { key: "workType", label: "Work Type" },
        { key: "priority", label: "Priority" },
        { key: "assignedTechnicianName", label: "Technician", render: (value: unknown) => value ?? "-" },
        { key: "scheduledStart", label: "Scheduled", render: (value: unknown) => formatDate(value as string | null) },
        { key: "status", label: "Status" },
        { key: "totalCost", label: "Total Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
      ] satisfies Column<MaintenanceWorkOrderReportRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: MaintenanceWorkOrderReportRow) => router.push(`/maintenance/work-orders/${record.id}`) },
      ] satisfies TableAction[],
      kpis: (typedRows: MaintenanceWorkOrderReportRow[]) => [
        { label: "Open Work Orders", value: typedRows.length },
        { label: "Critical / High", value: typedRows.filter((row) => ["CRITICAL", "HIGH"].includes(row.priority)).length },
        { label: "Total Cost", value: formatMoney(typedRows.reduce((sum, row) => sum + Number(row.totalCost ?? 0), 0)) },
      ],
    },
    "overdue-work-orders": {
      title: "Overdue Work Orders",
      subtitle: "Open work orders whose scheduled finish is already past due.",
      statusOptions: ["APPROVED", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_EXTERNAL_SERVICE"],
      columns: [
        { key: "workOrderNo", label: "Work Order No" },
        { key: "assetCode", label: "Asset Code", render: (value: unknown) => value ?? "-" },
        { key: "assetName", label: "Asset" },
        { key: "priority", label: "Priority" },
        { key: "scheduledStart", label: "Scheduled", render: (value: unknown) => formatDate(value as string | null) },
        { key: "assignedTechnicianName", label: "Technician", render: (value: unknown) => value ?? "-" },
        { key: "status", label: "Status" },
        { key: "totalCost", label: "Total Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
      ] satisfies Column<MaintenanceWorkOrderReportRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: MaintenanceWorkOrderReportRow) => router.push(`/maintenance/work-orders/${record.id}`) },
      ] satisfies TableAction[],
      kpis: (typedRows: MaintenanceWorkOrderReportRow[]) => [
        { label: "Overdue", value: typedRows.length },
        { label: "High Priority", value: typedRows.filter((row) => ["CRITICAL", "HIGH"].includes(row.priority)).length },
      ],
    },
    breakdowns: {
      title: "Breakdown Tickets",
      subtitle: "Breakdown, corrective, and emergency maintenance requests requiring response and closure.",
      statusOptions: ["DRAFT", "SUBMITTED", "APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CLOSED", "CANCELLED", "REJECTED"],
      columns: [
        { key: "ticketNo", label: "Ticket No" },
        { key: "assetCode", label: "Asset Code", render: (value: unknown) => value ?? "-" },
        { key: "assetName", label: "Asset" },
        { key: "locationName", label: "Location", render: (value: unknown) => value ?? "-" },
        { key: "type", label: "Type" },
        { key: "priority", label: "Priority" },
        { key: "requestDate", label: "Requested", render: (value: unknown) => formatDate(value as string | null) },
        { key: "targetCompletionDate", label: "Target", render: (value: unknown) => formatDate(value as string | null) },
        { key: "assignedToName", label: "Assigned To", render: (value: unknown) => value ?? "-" },
        { key: "status", label: "Status" },
      ] satisfies Column<MaintenanceTicketReportRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: MaintenanceTicketReportRow) => router.push(`/maintenance/tickets/${record.id}`) },
      ] satisfies TableAction[],
      kpis: (typedRows: MaintenanceTicketReportRow[]) => [
        { label: "Breakdowns", value: typedRows.length },
        { label: "Critical", value: typedRows.filter((row) => row.priority === "CRITICAL").length },
        { label: "Downtime Linked", value: typedRows.filter((row) => !!row.productionDowntimeId).length },
      ],
    },
    "preventive-maintenance": {
      title: "Preventive Maintenance",
      subtitle: "Preventive plans, due schedule, and completion cadence across live assets.",
      statusOptions: ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"],
      columns: [
        { key: "planNo", label: "Plan No" },
        { key: "assetCode", label: "Asset Code", render: (value: unknown) => value ?? "-" },
        { key: "assetName", label: "Asset" },
        { key: "locationName", label: "Location", render: (value: unknown) => value ?? "-" },
        { key: "title", label: "Title" },
        { key: "maintenanceType", label: "Type" },
        { key: "frequencyType", label: "Frequency" },
        { key: "triggerType", label: "Trigger" },
        { key: "frequencyValue", label: "Every" },
        { key: "nextDueDate", label: "Next Due", render: (value: unknown) => formatDate(value as string | null) },
        { key: "lastCompletedDate", label: "Last Completed", render: (value: unknown) => formatDate(value as string | null) },
        { key: "scheduledCount", label: "Scheduled" },
        { key: "completedCount", label: "Completed" },
        { key: "missedCount", label: "Missed" },
        { key: "postponedCount", label: "Postponed" },
        { key: "compliancePercent", label: "Compliance %", render: (value: unknown) => `${Number(value ?? 0).toFixed(1)}%` },
        { key: "plannedSpareCost", label: "Planned Spare Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
        { key: "actualMaintenanceCost", label: "Actual Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
        { key: "status", label: "Status" },
      ] satisfies Column<PreventiveMaintenanceReportRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: PreventiveMaintenanceReportRow) => router.push(`/maintenance/pm/${record.id}`) },
      ] satisfies TableAction[],
      kpis: (typedRows: PreventiveMaintenanceReportRow[]) => [
        { label: "PM Plans", value: typedRows.length },
        { label: "Due Scheduled", value: typedRows.filter((row) => !!row.nextDueDate).length },
        { label: "Active", value: typedRows.filter((row) => row.status === "ACTIVE").length },
        { label: "Overdue", value: typedRows.filter((row) => row.overdue).length },
        { label: "Avg Compliance", value: `${(typedRows.reduce((sum, row) => sum + (row.compliancePercent ?? 0), 0) / Math.max(typedRows.length, 1)).toFixed(1)}%` },
      ],
    },
    "pm-compliance": {
      title: "PM Compliance",
      subtitle: "Scheduled versus completed preventive maintenance and overdue plans.",
      statusOptions: ["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "CANCELLED"],
      columns: [
        { key: "planNo", label: "Plan No" },
        { key: "assetCode", label: "Asset Code", render: (value: unknown) => value ?? "-" },
        { key: "assetName", label: "Asset" },
        { key: "scheduledCount", label: "Scheduled" },
        { key: "completedCount", label: "Completed" },
        { key: "missedCount", label: "Missed" },
        { key: "compliancePercent", label: "Compliance %", render: (value: unknown) => `${Number(value ?? 0).toFixed(1)}%` },
        { key: "overdue", label: "Overdue", render: (value: unknown) => value ? "Yes" : "No" },
        { key: "nextDueDate", label: "Next Due", render: (value: unknown) => formatDate(value as string | null) },
        { key: "status", label: "Status" },
      ] satisfies Column<PreventiveMaintenanceReportRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: PreventiveMaintenanceReportRow) => router.push(`/maintenance/pm/${record.id}`) },
      ] satisfies TableAction[],
      kpis: (typedRows: PreventiveMaintenanceReportRow[]) => [
        { label: "Plans", value: typedRows.length },
        { label: "Overdue", value: typedRows.filter((row) => row.overdue).length },
        { label: "Avg Compliance", value: `${(typedRows.reduce((sum, row) => sum + (row.compliancePercent ?? 0), 0) / Math.max(typedRows.length, 1)).toFixed(1)}%` },
      ],
    },
    downtime: {
      title: "Maintenance Downtime",
      subtitle: "Production downtime cases linked back to maintenance tickets and recovery activity.",
      statusOptions: ["DRAFT", "SUBMITTED", "APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "CLOSED", "CANCELLED", "REJECTED"],
      columns: [
        { key: "ticketNo", label: "Ticket No" },
        { key: "assetCode", label: "Asset Code", render: (value: unknown) => value ?? "-" },
        { key: "assetName", label: "Asset" },
        { key: "locationName", label: "Location", render: (value: unknown) => value ?? "-" },
        { key: "productionDate", label: "Production Date", render: (value: unknown) => formatDate(value as string | null) },
        { key: "reason", label: "Reason" },
        { key: "machine", label: "Machine", render: (value: unknown) => value ?? "-" },
        { key: "startTime", label: "Start", render: (value: unknown) => formatDateTime(value as string | null) },
        { key: "endTime", label: "End", render: (value: unknown) => formatDateTime(value as string | null) },
        { key: "durationMinutes", label: "Minutes" },
        { key: "status", label: "Ticket Status" },
      ] satisfies Column<MaintenanceDowntimeReportRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: MaintenanceDowntimeReportRow) => router.push(`/maintenance/tickets/${record.ticketId}`) },
      ] satisfies TableAction[],
      kpis: (typedRows: MaintenanceDowntimeReportRow[]) => [
        { label: "Downtime Events", value: typedRows.length },
        { label: "Downtime Minutes", value: typedRows.reduce((sum, row) => sum + Number(row.durationMinutes ?? 0), 0) },
        { label: "Open Tickets", value: typedRows.filter((row) => !["COMPLETED", "CLOSED"].includes(row.status)).length },
      ],
    },
    "spare-parts-usage": {
      title: "Spare Parts Usage",
      subtitle: "Spare consumption, returns, and issue traceability from maintenance work orders.",
      statusOptions: ["DRAFT", "SUBMITTED", "APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "TESTED", "CLOSED", "CANCELLED", "REJECTED"],
      columns: [
        { key: "workOrderNo", label: "Work Order" },
        { key: "assetCode", label: "Asset Code", render: (value: unknown) => value ?? "-" },
        { key: "assetName", label: "Asset" },
        { key: "itemCode", label: "Item Code", render: (value: unknown) => value ?? "-" },
        { key: "itemName", label: "Item" },
        { key: "uomName", label: "UOM", render: (value: unknown) => value ?? "-" },
        { key: "issuedQty", label: "Issued Qty" },
        { key: "usedQty", label: "Used Qty" },
        { key: "returnedQty", label: "Returned Qty" },
        { key: "damagedQty", label: "Damaged Qty" },
        { key: "directIssue", label: "Direct Issue", render: (value: unknown) => value ? "Yes" : "No" },
        { key: "unitCost", label: "Unit Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
        { key: "totalCost", label: "Total Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
        { key: "status", label: "Status" },
      ] satisfies Column<MaintenanceSpareUsageReportRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: MaintenanceSpareUsageReportRow) => router.push(`/maintenance/work-orders/${record.workOrderId}`) },
      ] satisfies TableAction[],
      kpis: (typedRows: MaintenanceSpareUsageReportRow[]) => [
        { label: "Part Lines", value: typedRows.length },
        { label: "Used Qty", value: typedRows.reduce((sum, row) => sum + Number(row.usedQty ?? 0), 0) },
        { label: "Usage Cost", value: formatMoney(typedRows.reduce((sum, row) => sum + Number(row.totalCost ?? 0), 0)) },
      ],
    },
    "spare-damage": {
      title: "Spare Damage",
      subtitle: "Spare lines with recorded damage during maintenance work.",
      statusOptions: ["APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "TESTED", "CLOSED"],
      columns: [
        { key: "workOrderNo", label: "Work Order" },
        { key: "assetCode", label: "Asset Code", render: (value: unknown) => value ?? "-" },
        { key: "itemCode", label: "Item Code", render: (value: unknown) => value ?? "-" },
        { key: "itemName", label: "Item" },
        { key: "damagedQty", label: "Damaged Qty" },
        { key: "issuedQty", label: "Issued Qty" },
        { key: "totalCost", label: "Total Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
        { key: "status", label: "Status" },
      ] satisfies Column<MaintenanceSpareUsageReportRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: MaintenanceSpareUsageReportRow) => router.push(`/maintenance/work-orders/${record.workOrderId}`) },
      ] satisfies TableAction[],
      kpis: (typedRows: MaintenanceSpareUsageReportRow[]) => [
        { label: "Damaged Lines", value: typedRows.length },
        { label: "Damaged Qty", value: typedRows.reduce((sum, row) => sum + Number(row.damagedQty ?? 0), 0) },
      ],
    },
    "direct-issues": {
      title: "Direct Spare Issues",
      subtitle: "Spare issues that bypassed a store requisition and were issued directly to the work order.",
      statusOptions: ["APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "TESTED", "CLOSED"],
      columns: [
        { key: "workOrderNo", label: "Work Order" },
        { key: "assetCode", label: "Asset Code", render: (value: unknown) => value ?? "-" },
        { key: "itemCode", label: "Item Code", render: (value: unknown) => value ?? "-" },
        { key: "itemName", label: "Item" },
        { key: "issuedQty", label: "Issued Qty" },
        { key: "directIssue", label: "Direct Issue", render: (value: unknown) => value ? "Yes" : "No" },
        { key: "totalCost", label: "Total Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
        { key: "status", label: "Status" },
      ] satisfies Column<MaintenanceSpareUsageReportRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: MaintenanceSpareUsageReportRow) => router.push(`/maintenance/work-orders/${record.workOrderId}`) },
      ] satisfies TableAction[],
      kpis: (typedRows: MaintenanceSpareUsageReportRow[]) => [
        { label: "Direct Issue Lines", value: typedRows.length },
        { label: "Issue Cost", value: formatMoney(typedRows.reduce((sum, row) => sum + Number(row.totalCost ?? 0), 0)) },
      ],
    },
    "asset-maintenance-cost": {
      title: "Asset Maintenance Cost",
      subtitle: "Rolled-up maintenance cost by asset across labor, spares, and external service.",
      statusOptions: ["DRAFT", "SUBMITTED", "APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "TESTED", "CLOSED", "CANCELLED", "REJECTED"],
      columns: [
        { key: "assetCode", label: "Asset Code" },
        { key: "assetName", label: "Asset" },
        { key: "locationName", label: "Location", render: (value: unknown) => value ?? "-" },
        { key: "workOrderCount", label: "Work Orders" },
        { key: "spareCost", label: "Spare Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
        { key: "laborCost", label: "Labor Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
        { key: "externalCost", label: "External Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
        { key: "totalCost", label: "Total Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
        { key: "lastCompletionDate", label: "Last Completion", render: (value: unknown) => formatDate(value as string | null) },
      ] satisfies Column<MaintenanceAssetCostReportRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: MaintenanceAssetCostReportRow) => router.push(`/assets/${record.assetId}`) },
      ] satisfies TableAction[],
      kpis: (typedRows: MaintenanceAssetCostReportRow[]) => [
        { label: "Assets Costed", value: typedRows.length },
        { label: "Total Cost", value: formatMoney(typedRows.reduce((sum, row) => sum + Number(row.totalCost ?? 0), 0)) },
        { label: "Work Orders", value: typedRows.reduce((sum, row) => sum + Number(row.workOrderCount ?? 0), 0) },
      ],
    },
    "open-tickets": {
      title: "Open Maintenance Tickets",
      subtitle: "Tickets still awaiting assignment, work, testing, or closure.",
      statusOptions: ["DRAFT", "SUBMITTED", "APPROVED", "ASSIGNED", "IN_PROGRESS", "WAITING_PARTS", "WAITING_EXTERNAL_SERVICE", "COMPLETED", "TESTED"],
      columns: [
        { key: "ticketNo", label: "Ticket No" },
        { key: "assetCode", label: "Asset Code", render: (value: unknown) => value ?? "-" },
        { key: "assetName", label: "Asset" },
        { key: "locationName", label: "Location", render: (value: unknown) => value ?? "-" },
        { key: "type", label: "Type" },
        { key: "priority", label: "Priority" },
        { key: "requestDate", label: "Requested", render: (value: unknown) => formatDate(value as string | null) },
        { key: "targetCompletionDate", label: "Target", render: (value: unknown) => formatDate(value as string | null) },
        { key: "assignedToName", label: "Assigned To", render: (value: unknown) => value ?? "-" },
        { key: "status", label: "Status" },
      ] satisfies Column<MaintenanceTicketReportRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: MaintenanceTicketReportRow) => router.push(`/maintenance/tickets/${record.id}`) },
      ] satisfies TableAction[],
      kpis: (typedRows: MaintenanceTicketReportRow[]) => [
        { label: "Open Tickets", value: typedRows.length },
        { label: "Unassigned", value: typedRows.filter((row) => !row.assignedToName).length },
        { label: "Overdue", value: typedRows.filter((row) => row.targetCompletionDate && new Date(row.targetCompletionDate) < new Date()).length },
      ],
    },
    "warranty-expiry": {
      title: "Warranty Expiry",
      subtitle: "Assets with a warranty end date, ordered by the soonest expiry.",
      statusOptions: ["ACTIVE", "UNDER_MAINTENANCE", "OUT_OF_SERVICE", "RETIRED", "DISPOSED"],
      columns: [
        { key: "assetCode", label: "Asset Code" },
        { key: "assetName", label: "Asset" },
        { key: "locationName", label: "Location", render: (value: unknown) => value ?? "-" },
        { key: "warrantyEnd", label: "Warranty End", render: (value: unknown) => formatDate(value as string | null) },
        { key: "daysRemaining", label: "Days Remaining" },
        { key: "status", label: "Status" },
      ] satisfies Column<MaintenanceWarrantyExpiryRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: MaintenanceWarrantyExpiryRow) => router.push(`/assets/${record.assetId}`) },
      ] satisfies TableAction[],
      kpis: (typedRows: MaintenanceWarrantyExpiryRow[]) => [
        { label: "Assets", value: typedRows.length },
        { label: "Expired", value: typedRows.filter((row) => row.daysRemaining < 0).length },
        { label: "Due in 30 days", value: typedRows.filter((row) => row.daysRemaining >= 0 && row.daysRemaining <= 30).length },
      ],
    },
    "department-cost": {
      title: "Department Maintenance Cost",
      subtitle: "Rolled-up spare, labor, and external cost by owning department.",
      statusOptions: ["APPROVED", "ASSIGNED", "IN_PROGRESS", "COMPLETED", "TESTED", "CLOSED"],
      columns: [
        { key: "departmentName", label: "Department", render: (value: unknown) => value ?? "Unassigned" },
        { key: "workOrderCount", label: "Work Orders" },
        { key: "spareCost", label: "Spare Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
        { key: "laborCost", label: "Labor Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
        { key: "externalCost", label: "External Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
        { key: "totalCost", label: "Total Cost", render: (value: unknown) => formatMoney(Number(value ?? 0)) },
      ] satisfies Column<MaintenanceDepartmentCostRow>[],
      actions: [] satisfies TableAction[],
      kpis: (typedRows: MaintenanceDepartmentCostRow[]) => [
        { label: "Departments", value: typedRows.length },
        { label: "Total Cost", value: formatMoney(typedRows.reduce((sum, row) => sum + Number(row.totalCost ?? 0), 0)) },
      ],
    },
    "repeat-failures": {
      title: "Repeat Failures",
      subtitle: "Assets with more than one breakdown or corrective ticket in the selected period.",
      statusOptions: ["ACTIVE", "UNDER_MAINTENANCE", "OUT_OF_SERVICE"],
      columns: [
        { key: "assetCode", label: "Asset Code" },
        { key: "assetName", label: "Asset" },
        { key: "locationName", label: "Location", render: (value: unknown) => value ?? "-" },
        { key: "breakdownCount", label: "Failures" },
        { key: "lastFailureDate", label: "Last Failure", render: (value: unknown) => formatDate(value as string | null) },
        { key: "status", label: "Status" },
      ] satisfies Column<MaintenanceRepeatFailureRow>[],
      actions: [
        { label: "View", icon: <Eye size={16} />, onClick: (record: MaintenanceRepeatFailureRow) => router.push(`/assets/${record.assetId}`) },
      ] satisfies TableAction[],
      kpis: (typedRows: MaintenanceRepeatFailureRow[]) => [
        { label: "Repeat Assets", value: typedRows.length },
        { label: "Total Failures", value: typedRows.reduce((sum, row) => sum + Number(row.breakdownCount ?? 0), 0) },
      ],
    },
  } as const;

  const config = configs[reportKey];
  const exportRows = buildExportRows(reportKey, rows);

  return (
    <ReportPageShell
      hero={
        <ReportHeader
          title={config.title}
          subtitle={config.subtitle}
          breadcrumbs={breadcrumbs}
          refreshedAt={refreshedAt}
          actions={<ReportExportActions fileName={reportKey} rows={exportRows} />}
        />
      }
      filters={
        <MaintenanceReportFilters
          assets={assets}
          locations={locations}
          statusOptions={config.statusOptions.map((status) => ({ value: status, label: status.replaceAll("_", " ") }))}
          showAsset={reportKey !== "spare-parts-usage" ? true : true}
        />
      }
      kpis={<ReportKpiGrid items={config.kpis(rows as never[])} />}
    >
      <ReportTable
        columns={config.columns as Column<Row>[]}
        data={rows}
        actions={config.actions as TableAction[]}
        pageSize={15}
        emptyState={
          <ReportEmptyState
            title={`No ${config.title.toLowerCase()} found`}
            message="No records matched the current maintenance report filters and access scope."
          />
        }
      />
    </ReportPageShell>
  );
}

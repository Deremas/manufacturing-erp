export interface AssetType {
  id: string;
  code: string;
  name: string;
  description?: string | null;
  isActive: boolean;
}

export interface AssetCategory {
  id: string;
  code: string;
  name: string;
  assetTypeId?: string | null;
  assetTypeName?: string | null;
  description?: string | null;
  isActive: boolean;
}

export interface MaintenanceAsset {
  id: string;
  publicId: number;
  assetCode: string;
  assetName: string;
  assetClass: string;
  assetTypeId: string;
  assetTypeCode?: string;
  assetTypeName?: string;
  assetCategoryId?: string;
  assetCategoryCode?: string;
  assetCategoryName?: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  manufactureYear?: number;
  locationId: string;
  locationCode?: string;
  locationName?: string;
  departmentId?: string;
  departmentName?: string;
  responsibleUserId?: string;
  responsibleUserName?: string;
  purchaseDate?: string;
  installationDate?: string;
  commissioningDate?: string;
  purchaseCost?: number;
  currentBookValue?: number;
  warrantyStart?: string;
  warrantyEnd?: string;
  expectedLifeYears?: number;
  meterType?: string;
  meterUnit?: string;
  currentMeterReading?: number;
  supplierId?: string;
  purchaseOrderId?: string;
  grnId?: string;
  isProductionAsset: boolean;
  isMaintenanceRequired: boolean;
  status: string;
  criticality: string;
  description?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceTicket {
  id: string;
  publicId: number;
  ticketNo: string;
  requestDate: string;
  assetId: string;
  assetCode?: string;
  assetName?: string;
  locationId: string;
  locationCode?: string;
  locationName?: string;
  departmentId?: string;
  departmentName?: string;
  requestedById: string;
  requestedByName?: string;
  assignedToId?: string;
  assignedToName?: string;
  type: string;
  priority: string;
  problemDescription: string;
  failureDate?: string;
  productionDowntimeId?: string;
  status: string;
  approvalStatus: string;
  targetCompletionDate?: string;
  actualCompletionDate?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MaintenanceWorkOrderPart {
  id: string;
  itemId: string;
  stockIssueId?: string;
  itemCode?: string;
  itemName?: string;
  unitId?: string;
  unitCode?: string;
  unitName?: string;
  requestedQty: number;
  issuedQty: number;
  usedQty: number;
  returnedQty: number;
  damagedQty: number;
  unresolvedQty: number;
  damageReason?: string;
  availableQty?: number;
  unitCost: number;
  totalCost: number;
  remarks?: string;
}

export interface MaintenanceLabor {
  id: string;
  employeeId?: string;
  employeeName?: string;
  hours: number;
  hourlyRate: number;
  totalCost: number;
  remarks?: string;
}

export interface MaintenanceExternalCost {
  id: string;
  supplierId?: string;
  supplierName?: string;
  description: string;
  amount: number;
  invoiceReference?: string;
  remarks?: string;
}

export interface MaintenanceWorkOrder {
  id: string;
  publicId: number;
  workOrderNo: string;
  ticketId?: string;
  ticketNo?: string;
  assetId: string;
  assetCode?: string;
  assetName?: string;
  locationId: string;
  locationCode?: string;
  locationName?: string;
  assignedTechnicianId?: string;
  assignedTechnicianName?: string;
  supervisorId?: string;
  supervisorName?: string;
  workType: string;
  priority: string;
  scheduledStart: string;
  scheduledEnd: string;
  actualStart?: string;
  actualEnd?: string;
  problemDescription: string;
  diagnosis?: string;
  workPerformed?: string;
  rootCause?: string;
  correctiveAction?: string;
  preventiveAction?: string;
  testResult?: string;
  status: string;
  totalSpareCost: number;
  totalLaborCost: number;
  totalExternalCost: number;
  totalCost: number;
  completedById?: string;
  completedByName?: string;
  approvedById?: string;
  approvedByName?: string;
  createdById?: string;
  checkedById?: string;
  closedById?: string;
  closedByName?: string;
  createdAt: string;
  updatedAt: string;
  parts: MaintenanceWorkOrderPart[];
  labor: MaintenanceLabor[];
  externalCosts: MaintenanceExternalCost[];
}

export interface PreventiveMaintenanceExecution {
  id: string;
  planId: string;
  workOrderId?: string;
  workOrderNo?: string;
  scheduledDate: string;
  completedDate?: string;
  meterReading?: number;
  triggerType: string;
  triggerValue?: number;
  status: string;
  result?: string;
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PreventiveMaintenancePlanTask {
  id: string;
  sequence: number;
  task: string;
  instructions?: string;
  isMandatory: boolean;
  expectedResult?: string;
}

export interface PreventiveMaintenancePlanSpare {
  id: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  uom?: string;
  quantity: number;
  availableQuantity: number;
  remarks?: string;
}

export interface PreventiveMaintenanceScheduleChange {
  id: string;
  previousDueDate: string;
  requestedDueDate: string;
  reason: string;
  status: string;
  requestedById: string;
  requestedAt: string;
  remarks?: string;
}

export interface PreventiveMaintenancePlan {
  id: string;
  publicId: number;
  planNo: string;
  assetId: string;
  locationId: string;
  assetCode?: string;
  assetName?: string;
  title: string;
  maintenanceType: string;
  frequencyType: string;
  frequencyValue: number;
  nextDueDate?: string;
  meterInterval?: number;
  nextMeterReading?: number;
  checklist?: string;
  estimatedDurationMinutes: number;
  requiredRoleId?: string;
  requiredRoleName?: string;
  triggerType: string;
  leadTimeDays: number;
  gracePeriodDays: number;
  autoGenerateWorkOrder: boolean;
  priority: string;
  preferredTechnicianId?: string;
  preferredTechnicianName?: string;
  plannedDowntimeMinutes: number;
  lastGeneratedAt?: string;
  currentMeterReading?: number;
  dueReason?: string;
  status: string;
  lastCompletedDate?: string;
  createdAt: string;
  updatedAt: string;
  executions: PreventiveMaintenanceExecution[];
  tasks: PreventiveMaintenancePlanTask[];
  plannedSpares: PreventiveMaintenancePlanSpare[];
  scheduleChanges: PreventiveMaintenanceScheduleChange[];
}

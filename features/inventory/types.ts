// ----------------------------------------------------------------------------
// NEW ERP — Inventory Types
// ----------------------------------------------------------------------------

export interface StockBalanceView {
  itemCode: string;
  itemName: string;
  category: string;
  location: string;
  quantity: number;
  reserved: number;
  available: number;
  unitCost: number;
  lastMovementDate: string | null;
}

export interface BinCardEntry {
  date: string;
  movementType: string;
  documentRef: string;
  in: number;
  out: number;
  balance: number;
  remarks: string;
}

export interface TransferRecord {
  id: string;
  transferNumber: string;
  date: string;
  fromLocation: string;
  toLocation: string;
  status: string;
  items: number;
  createdBy: string;
}

export interface TransferLineItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  unitCost: number;
  notes?: string;
}

export interface AdjustmentRecord {
  id: string;
  adjustmentNumber: string;
  date: string;
  location: string;
  type: string;
  reason: string;
  items: number;
  status: string;
}

export interface AdjustmentLineItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  adjustmentType: "increase" | "decrease";
  quantity: number;
  unitCost: number;
  reason?: string;
}

export interface RequisitionRecord {
  id: string;
  requisitionNumber: string;
  date: string;
  department: string;
  requestedBy: string;
  status: string;
  items: number;
}

export interface RequisitionLineItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  quantityRequired: number;
  quantityIssued: number;
  notes?: string;
}

export interface IssueVoucher {
  id: string;
  voucherNumber: string;
  date: string;
  department: string;
  issuedTo: string;
  status: string;
  items: number;
}

export interface IssueLineItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  quantity: number;
  fromLocation: string;
}

export interface ReturnVoucher {
  id: string;
  returnNumber: string;
  date: string;
  fromDepartment: string;
  reason: string;
  status: string;
  items: number;
}

export interface ReturnLineItem {
  itemId: string;
  itemCode: string;
  itemName: string;
  quantityReturned: number;
  toLocation: string;
}

export interface SRVRecord {
  id: string;
  returnNumber: string;
  date: string;
  supplier: string;
  item: string;
  quantity: number;
  reason: string;
  status: string;
}

export interface ProductionBinCardEntry {
  date: string;
  batchNo: string;
  item: string;
  movementType: string;
  quantityIn: number;
  quantityOut: number;
  balance: number;
  remarks: string;
}

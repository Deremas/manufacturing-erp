import { sql } from "@/lib/db";
import {
  issueForSales,
  issueToProduction,
  postAdjustment,
  postStockIssue,
  postStockMovement,
  postStockReturn,
  postTransfer,
  receiveProductionOutput,
  receivePurchase,
  receiveSalesReturn,
  returnPurchase,
} from "@/services/inventory/inventory-posting.service";

type Tx = typeof sql;
interface IntegrationOptions {
  tx?: Tx;
}

export interface InventoryModuleLineInput {
  itemId: string;
  quantity?: number;
  differenceQty?: number;
  unitCost: number;
  remarks?: string;
}

async function postLineBatch<T extends InventoryModuleLineInput>(
  tx: Tx,
  lines: T[],
  handler: (line: T, tx: Tx) => Promise<unknown>,
) {
  for (const line of lines) {
    await handler(line, tx);
  }
}

export async function postProcurementReceiptDocument(input: {
  grnId: string;
  locationId: string;
  createdById: string;
  remarks?: string;
  lines: InventoryModuleLineInput[];
}, options: IntegrationOptions = {}) {
  const execute = async (tx: Tx) => {
    await postLineBatch(tx, input.lines, (line, transaction) =>
      receivePurchase({
        itemId: line.itemId,
        locationId: input.locationId,
        sourceModule: "procurement.grn",
        sourceDocumentId: input.grnId,
        qtyIn: Number(line.quantity ?? 0),
        qtyOut: 0,
        unitCost: Number(line.unitCost ?? 0),
        remarks: line.remarks ?? input.remarks,
        createdById: input.createdById,
      }, { tx: transaction }),
    );
  };

  if (options.tx) {
    return execute(options.tx);
  }

  return sql.begin(execute);
}

export async function inventoryFromProcurementGRN(input: {
  itemId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  grnId: string;
  createdById: string;
  remarks?: string;
}) {
  return postProcurementReceiptDocument({
    grnId: input.grnId,
    locationId: input.locationId,
    createdById: input.createdById,
    remarks: input.remarks,
    lines: [{ itemId: input.itemId, quantity: input.quantity, unitCost: input.unitCost, remarks: input.remarks }],
  });
}

export async function postSupplierReturnDocument(input: {
  supplierReturnId: string;
  locationId: string;
  createdById: string;
  remarks?: string;
  lines: InventoryModuleLineInput[];
}, options: IntegrationOptions = {}) {
  const execute = async (tx: Tx) => {
    await postLineBatch(tx, input.lines, (line, transaction) =>
      returnPurchase({
        itemId: line.itemId,
        locationId: input.locationId,
        sourceModule: "procurement.supplier-return",
        sourceDocumentId: input.supplierReturnId,
        qtyIn: Number(line.quantity ?? 0),
        qtyOut: 0,
        unitCost: Number(line.unitCost ?? 0),
        remarks: line.remarks ?? input.remarks,
        createdById: input.createdById,
      }, { tx: transaction }),
    );
  };

  if (options.tx) {
    return execute(options.tx);
  }

  return sql.begin(execute);
}

export async function inventoryFromSupplierReturn(input: {
  itemId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  supplierReturnId: string;
  createdById: string;
  remarks?: string;
}) {
  return postSupplierReturnDocument({
    supplierReturnId: input.supplierReturnId,
    locationId: input.locationId,
    createdById: input.createdById,
    remarks: input.remarks,
    lines: [{ itemId: input.itemId, quantity: input.quantity, unitCost: input.unitCost, remarks: input.remarks }],
  });
}

export async function postProductionMaterialIssueDocument(input: {
  productionOrderId: string;
  locationId: string;
  createdById: string;
  remarks?: string;
  lines: InventoryModuleLineInput[];
}, options: IntegrationOptions = {}) {
  const execute = async (tx: Tx) => {
    await postLineBatch(tx, input.lines, (line, transaction) =>
      issueToProduction({
        itemId: line.itemId,
        locationId: input.locationId,
        sourceModule: "production.issue",
        sourceDocumentId: input.productionOrderId,
        qtyIn: Number(line.quantity ?? 0),
        qtyOut: 0,
        unitCost: Number(line.unitCost ?? 0),
        remarks: line.remarks ?? input.remarks,
        createdById: input.createdById,
      }, { tx: transaction }),
    );
  };

  if (options.tx) {
    return execute(options.tx);
  }

  return sql.begin(execute);
}

export async function inventoryIssueToProduction(input: {
  itemId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  productionOrderId: string;
  createdById: string;
  remarks?: string;
}) {
  return postProductionMaterialIssueDocument({
    productionOrderId: input.productionOrderId,
    locationId: input.locationId,
    createdById: input.createdById,
    remarks: input.remarks,
    lines: [{ itemId: input.itemId, quantity: input.quantity, unitCost: input.unitCost, remarks: input.remarks }],
  });
}

export async function postProductionOutputDocument(input: {
  productionOrderId: string;
  locationId: string;
  createdById: string;
  remarks?: string;
  lines: InventoryModuleLineInput[];
}, options: IntegrationOptions = {}) {
  const execute = async (tx: Tx) => {
    await postLineBatch(tx, input.lines, (line, transaction) =>
      receiveProductionOutput({
        itemId: line.itemId,
        locationId: input.locationId,
        sourceModule: "production.output",
        sourceDocumentId: input.productionOrderId,
        qtyIn: Number(line.quantity ?? 0),
        qtyOut: 0,
        unitCost: Number(line.unitCost ?? 0),
        remarks: line.remarks ?? input.remarks,
        createdById: input.createdById,
      }, { tx: transaction }),
    );
  };

  if (options.tx) {
    return execute(options.tx);
  }

  return sql.begin(execute);
}

export async function inventoryReceiveProduction(input: {
  itemId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  productionOrderId: string;
  createdById: string;
  remarks?: string;
}) {
  return postProductionOutputDocument({
    productionOrderId: input.productionOrderId,
    locationId: input.locationId,
    createdById: input.createdById,
    remarks: input.remarks,
    lines: [{ itemId: input.itemId, quantity: input.quantity, unitCost: input.unitCost, remarks: input.remarks }],
  });
}

export async function postProductionMaterialReturnDocument(input: {
  productionReturnId: string;
  locationId: string;
  createdById: string;
  remarks?: string;
  lines: InventoryModuleLineInput[];
}, options: IntegrationOptions = {}) {
  const execute = async (tx: Tx) => {
    await postLineBatch(tx, input.lines, (line, transaction) =>
      postStockReturn({
        itemId: line.itemId,
        locationId: input.locationId,
        sourceModule: "production.material-return",
        sourceDocumentId: input.productionReturnId,
        qtyIn: Number(line.quantity ?? 0),
        qtyOut: 0,
        unitCost: Number(line.unitCost ?? 0),
        remarks: line.remarks ?? input.remarks,
        createdById: input.createdById,
      }, { tx: transaction }),
    );
  };

  if (options.tx) {
    return execute(options.tx);
  }

  return sql.begin(execute);
}

export async function postSalesInvoiceDocument(input: {
  invoiceId: string;
  locationId: string;
  createdById: string;
  remarks?: string;
  lines: InventoryModuleLineInput[];
}) {
  return sql.begin(async (tx) => {
    await postLineBatch(tx, input.lines, (line, transaction) =>
      issueForSales({
        itemId: line.itemId,
        locationId: input.locationId,
        sourceModule: "sales.invoice",
        sourceDocumentId: input.invoiceId,
        qtyIn: Number(line.quantity ?? 0),
        qtyOut: 0,
        unitCost: Number(line.unitCost ?? 0),
        remarks: line.remarks ?? input.remarks,
        createdById: input.createdById,
      }, { tx: transaction }),
    );
  });
}

export async function inventoryIssueForSales(input: {
  itemId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  invoiceId: string;
  createdById: string;
  remarks?: string;
}) {
  return postSalesInvoiceDocument({
    invoiceId: input.invoiceId,
    locationId: input.locationId,
    createdById: input.createdById,
    remarks: input.remarks,
    lines: [{ itemId: input.itemId, quantity: input.quantity, unitCost: input.unitCost, remarks: input.remarks }],
  });
}

export async function postSalesReturnDocument(input: {
  returnId: string;
  locationId: string;
  createdById: string;
  remarks?: string;
  lines: InventoryModuleLineInput[];
}) {
  return sql.begin(async (tx) => {
    await postLineBatch(tx, input.lines, (line, transaction) =>
      receiveSalesReturn({
        itemId: line.itemId,
        locationId: input.locationId,
        sourceModule: "sales.return",
        sourceDocumentId: input.returnId,
        qtyIn: Number(line.quantity ?? 0),
        qtyOut: 0,
        unitCost: Number(line.unitCost ?? 0),
        remarks: line.remarks ?? input.remarks,
        createdById: input.createdById,
      }, { tx: transaction }),
    );
  });
}

export async function inventorySalesReturn(input: {
  itemId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  returnId: string;
  createdById: string;
  remarks?: string;
}) {
  return postSalesReturnDocument({
    returnId: input.returnId,
    locationId: input.locationId,
    createdById: input.createdById,
    remarks: input.remarks,
    lines: [{ itemId: input.itemId, quantity: input.quantity, unitCost: input.unitCost, remarks: input.remarks }],
  });
}

export async function postMaintenanceOrFleetIssueDocument(input: {
  sourceModule: "maintenance.work-order" | "fleet.issue";
  sourceDocumentId: string;
  locationId: string;
  createdById: string;
  remarks?: string;
  lines: InventoryModuleLineInput[];
}) {
  return sql.begin(async (tx) => {
    await postLineBatch(tx, input.lines, (line, transaction) =>
      postStockIssue({
        itemId: line.itemId,
        locationId: input.locationId,
        sourceModule: input.sourceModule,
        sourceDocumentId: input.sourceDocumentId,
        qtyIn: Number(line.quantity ?? 0),
        qtyOut: 0,
        unitCost: Number(line.unitCost ?? 0),
        remarks: line.remarks ?? input.remarks,
        createdById: input.createdById,
      }, { tx: transaction }),
    );
  });
}

export async function inventoryIssueToMaintenanceOrFleet(input: {
  itemId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  sourceModule: "maintenance.work-order" | "fleet.issue";
  sourceDocumentId: string;
  createdById: string;
  remarks?: string;
}) {
  return postMaintenanceOrFleetIssueDocument({
    sourceModule: input.sourceModule,
    sourceDocumentId: input.sourceDocumentId,
    locationId: input.locationId,
    createdById: input.createdById,
    remarks: input.remarks,
    lines: [{ itemId: input.itemId, quantity: input.quantity, unitCost: input.unitCost, remarks: input.remarks }],
  });
}

export async function postMaintenanceOrFleetReturnDocument(input: {
  sourceModule: "maintenance.work-order" | "fleet.issue";
  sourceDocumentId: string;
  locationId: string;
  createdById: string;
  remarks?: string;
  lines: InventoryModuleLineInput[];
}) {
  return sql.begin(async (tx) => {
    await postLineBatch(tx, input.lines, (line, transaction) =>
      postStockReturn({
        itemId: line.itemId,
        locationId: input.locationId,
        sourceModule: input.sourceModule,
        sourceDocumentId: input.sourceDocumentId,
        qtyIn: Number(line.quantity ?? 0),
        qtyOut: 0,
        unitCost: Number(line.unitCost ?? 0),
        remarks: line.remarks ?? input.remarks,
        createdById: input.createdById,
      }, { tx: transaction }),
    );
  });
}

export async function inventoryReturnFromMaintenanceOrFleet(input: {
  itemId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  sourceModule: "maintenance.work-order" | "fleet.issue";
  sourceDocumentId: string;
  createdById: string;
  remarks?: string;
}) {
  return postMaintenanceOrFleetReturnDocument({
    sourceModule: input.sourceModule,
    sourceDocumentId: input.sourceDocumentId,
    locationId: input.locationId,
    createdById: input.createdById,
    remarks: input.remarks,
    lines: [{ itemId: input.itemId, quantity: input.quantity, unitCost: input.unitCost, remarks: input.remarks }],
  });
}

export async function postQCAdjustmentDocument(input: {
  qcDocumentId: string;
  locationId: string;
  createdById: string;
  remarks?: string;
  lines: InventoryModuleLineInput[];
}) {
  return sql.begin(async (tx) => {
    await postLineBatch(tx, input.lines, (line, transaction) =>
      postAdjustment({
        itemId: line.itemId,
        locationId: input.locationId,
        differenceQty: Number(line.differenceQty ?? 0),
        unitCost: Number(line.unitCost ?? 0),
        sourceDocumentId: input.qcDocumentId,
        createdById: input.createdById,
        remarks: line.remarks ?? input.remarks,
      }, { tx: transaction }),
    );
  });
}

export async function inventoryAdjustmentFromQC(input: {
  itemId: string;
  locationId: string;
  differenceQty: number;
  unitCost: number;
  qcDocumentId: string;
  createdById: string;
  remarks?: string;
}) {
  return postQCAdjustmentDocument({
    qcDocumentId: input.qcDocumentId,
    locationId: input.locationId,
    createdById: input.createdById,
    remarks: input.remarks,
    lines: [{ itemId: input.itemId, differenceQty: input.differenceQty, unitCost: input.unitCost, remarks: input.remarks }],
  });
}

export async function inventoryTransferRejectedQCToQuarantine(input: {
  itemId: string;
  fromLocationId: string;
  quarantineLocationId: string;
  quantity: number;
  unitCost: number;
  qcDocumentId: string;
  createdById: string;
  remarks?: string;
}) {
  return postTransfer({
    itemId: input.itemId,
    fromLocationId: input.fromLocationId,
    toLocationId: input.quarantineLocationId,
    quantity: input.quantity,
    unitCost: input.unitCost,
    remarks: input.remarks,
    createdById: input.createdById,
    sourceDocumentId: input.qcDocumentId,
  });
}

export async function inventoryScrapRejectedQCStock(input: {
  itemId: string;
  locationId: string;
  quantity: number;
  unitCost: number;
  qcDocumentId: string;
  createdById: string;
  remarks?: string;
}) {
  return postStockMovement({
    itemId: input.itemId,
    locationId: input.locationId,
    movementType: "SCRAP",
    sourceModule: "qc.scrap",
    sourceDocumentId: input.qcDocumentId,
    qtyIn: 0,
    qtyOut: input.quantity,
    unitCost: input.unitCost,
    remarks: input.remarks,
    createdById: input.createdById,
  });
}

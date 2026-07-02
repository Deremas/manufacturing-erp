import { randomUUID } from "crypto";

import { sql } from "@/lib/db";

export type StockMovementType =
  | "OPENING"
  | "PURCHASE_RECEIPT"
  | "PURCHASE_RETURN"
  | "PRODUCTION_ISSUE"
  | "PRODUCTION_RECEIPT"
  | "SALES_ISSUE"
  | "SALES_RETURN"
  | "TRANSFER_OUT"
  | "TRANSFER_IN"
  | "ADJUSTMENT_IN"
  | "ADJUSTMENT_OUT"
  | "STORE_ISSUE"
  | "STORE_RETURN"
  | "SCRAP"
  | "DAMAGED"
  | "EXPIRED";

type Tx = typeof sql;

export interface PostStockMovementInput {
  itemId: string;
  locationId: string;
  movementType: StockMovementType;
  sourceModule: string;
  sourceDocumentId?: string;
  qtyIn: number;
  qtyOut: number;
  unitCost: number;
  remarks?: string;
  createdById: string;
}

export interface PostStockMovementResult {
  movementNumber: string;
  movementId: string;
  quantity: number;
  averageCost: number;
  availableQuantity: number;
}

interface PostStockMovementOptions {
  tx?: Tx;
}

type DocumentNumberingLike = {
  id: string;
  prefix: string;
  prefixFormat: string;
  separator: string;
  yearFormat: string;
  monthFormat: string;
  dayFormat: string;
  sequenceLength: number;
  currentSequence: number;
};

function formatDatePart(format: string, date: Date): string {
  switch (format) {
    case "YY":
      return date.getFullYear().toString().slice(-2);
    case "YYYY":
    default:
      return date.getFullYear().toString();
  }
}

function buildDocumentNumber(config: DocumentNumberingLike, sequence: number): string {
  const date = new Date();
  const sep = config.separator ?? "";
  const year = formatDatePart(config.yearFormat, date);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const seq = String(sequence).padStart(config.sequenceLength, "0");

  let prefix = config.prefix;
  switch (config.prefixFormat) {
    case "PREFIX_YEAR":
      prefix = `${config.prefix}${sep}${year}`;
      break;
    case "PREFIX_YEAR_MONTH":
      prefix = `${config.prefix}${sep}${year}${sep}${month}`;
      break;
    case "PREFIX_YEAR_MONTH_DAY":
      prefix = `${config.prefix}${sep}${year}${sep}${month}${sep}${day}`;
      break;
    default:
      prefix = config.prefix;
  }

  return `${prefix}${sep}${seq}`;
}

async function nextDocumentNumber(tx: Tx, prefix: string): Promise<string> {
  await tx`
    INSERT INTO "DocumentNumbering" (
      id,
      prefix,
      description,
      "prefixFormat",
      separator,
      "yearFormat",
      "monthFormat",
      "dayFormat",
      "sequenceLength",
      "currentSequence",
      "isActive",
      "isArchived"
    )
    VALUES (
      ${`docnum-${prefix.toLowerCase()}`},
      ${prefix},
      ${`Auto-generated sequence for ${prefix}`},
      'PREFIX_YEAR',
      '-',
      'YYYY',
      'MM',
      'DD',
      4,
      0,
      true,
      false
    )
    ON CONFLICT (prefix) DO NOTHING
  `;

  const rows = await tx<Array<DocumentNumberingLike>>`
    SELECT
      id,
      prefix,
      "prefixFormat",
      separator,
      "yearFormat",
      "monthFormat",
      "dayFormat",
      "sequenceLength",
      "currentSequence"
    FROM "DocumentNumbering"
    WHERE prefix = ${prefix}
    LIMIT 1
    FOR UPDATE
  `;

  const config = rows[0];
  if (!config) throw new Error(`Document numbering config missing for prefix ${prefix}`);

  const nextSequence = config.currentSequence + 1;
  await tx`
    UPDATE "DocumentNumbering"
    SET "currentSequence" = ${nextSequence}
    WHERE id = ${config.id}
  `;

  return buildDocumentNumber(config, nextSequence);
}

async function writeAuditLog(
  tx: Tx,
  input: PostStockMovementInput,
  movementNumber: string,
  oldValue: Record<string, unknown>,
  newValue: Record<string, unknown>,
) {
  await tx`
    INSERT INTO "AuditLog" (
      id,
      "userId",
      action,
      module,
      "recordId",
      "oldValue",
      "newValue",
      "isArchived",
      timestamp
    )
    VALUES (
      ${randomUUID()},
      ${input.createdById},
      'POST',
      'inventory',
      ${movementNumber},
      ${JSON.stringify(oldValue)},
      ${JSON.stringify(newValue)},
      false,
      NOW()
    )
  `;
}

async function writeDocumentHistory(
  tx: Tx,
  input: PostStockMovementInput,
  movementNumber: string,
) {
  if (!input.sourceDocumentId) {
    return;
  }

  await tx`
    INSERT INTO "DocumentHistory" (
      id,
      "referenceType",
      "referenceId",
      action,
      "fieldName",
      "oldValue",
      "newValue",
      comment,
      "performedById",
      "isArchived",
      "createdAt"
    )
    VALUES (
      ${randomUUID()},
      ${input.sourceModule},
      ${input.sourceDocumentId},
      'POST',
      'inventory',
      NULL,
      ${movementNumber},
      ${input.remarks ?? null},
      ${input.createdById},
      false,
      NOW()
    )
  `;
}

function computeAverageCost(
  oldQty: number,
  oldAverage: number,
  qtyIn: number,
  incomingUnitCost: number,
) {
  const nextQty = oldQty + qtyIn;
  if (qtyIn <= 0) return oldAverage;
  if (nextQty <= 0) return incomingUnitCost;
  return ((oldQty * oldAverage) + (qtyIn * incomingUnitCost)) / nextQty;
}

async function postStockMovementInternal(
  tx: Tx,
  input: PostStockMovementInput,
): Promise<PostStockMovementResult> {
  const [itemRows, locationRows, balanceRows] = await Promise.all([
    tx<Array<{ id: string }>>`
      SELECT id FROM "Item" WHERE id = ${input.itemId} AND "isArchived" = false LIMIT 1
    `,
    tx<Array<{ id: string; allowNegativeStock: boolean }>>`
      SELECT id, "allowNegativeStock"
      FROM "Location"
      WHERE id = ${input.locationId} AND "isArchived" = false
      LIMIT 1
    `,
    tx<
      Array<{
        id: string;
        quantity: number;
        reservedQuantity: number;
        availableQuantity: number;
        averageCost: number;
      }>
    >`
      SELECT
        id,
        quantity,
        "reservedQuantity",
        "availableQuantity",
        "averageCost"
      FROM "StockBalance"
      WHERE "itemId" = ${input.itemId} AND "locationId" = ${input.locationId}
      LIMIT 1
    `,
  ]);

  const item = itemRows[0];
  const location = locationRows[0];
  const balance = balanceRows[0];

  if (!item) throw new Error(`Item not found: ${input.itemId}`);
  if (!location) throw new Error(`Location not found: ${input.locationId}`);

  const currentQty = balance?.quantity ?? 0;
  const reservedQty = balance?.reservedQuantity ?? 0;
  const currentAverage = balance?.averageCost ?? 0;
  const movementQty = input.qtyIn - input.qtyOut;
  const nextQty = currentQty + movementQty;

  if (
    input.qtyOut > 0 &&
    !location.allowNegativeStock &&
    (currentQty - reservedQty) < input.qtyOut
  ) {
    throw new Error("Insufficient available stock");
  }

  const nextAverage =
    input.qtyIn > 0
      ? computeAverageCost(currentQty, currentAverage, input.qtyIn, input.unitCost)
      : currentAverage;

  const movementNumber = await nextDocumentNumber(tx, "STK");
  const movementId = randomUUID();
  const totalCost = Math.abs(movementQty) * input.unitCost;

  await tx`
    INSERT INTO "StockMovement" (
      id,
      "movementNumber",
      date,
      "itemId",
      "locationId",
      "movementType",
      "sourceModule",
      "sourceDocumentId",
      "quantityIn",
      "quantityOut",
      "unitCost",
      "totalCost",
      "referenceType",
      "referenceId",
      remarks,
      "createdById",
      "isArchived",
      "createdAt"
    )
    VALUES (
      ${movementId},
      ${movementNumber},
      NOW(),
      ${input.itemId},
      ${input.locationId},
      ${input.movementType},
      ${input.sourceModule},
      ${input.sourceDocumentId ?? null},
      ${input.qtyIn},
      ${input.qtyOut},
      ${input.unitCost},
      ${totalCost},
      ${input.sourceModule},
      ${input.sourceDocumentId ?? movementNumber},
      ${input.remarks ?? null},
      ${input.createdById},
      false,
      NOW()
    )
  `;

  if (balance?.id) {
    await tx`
      UPDATE "StockBalance"
      SET
        quantity = ${nextQty},
        "availableQuantity" = ${nextQty - reservedQty},
        "averageCost" = ${nextAverage},
        "lastMovementDate" = NOW(),
        "updatedAt" = NOW()
      WHERE id = ${balance.id}
    `;
  } else {
    await tx`
      INSERT INTO "StockBalance" (
        id,
        "itemId",
        "locationId",
        quantity,
        "reservedQuantity",
        "availableQuantity",
        "averageCost",
        "lastMovementDate",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${randomUUID()},
        ${input.itemId},
        ${input.locationId},
        ${nextQty},
        ${reservedQty},
        ${nextQty - reservedQty},
        ${nextAverage},
        NOW(),
        false,
        NOW(),
        NOW()
      )
    `;
  }

  await writeAuditLog(
    tx,
    input,
    movementNumber,
    {
      quantity: currentQty,
      availableQuantity: balance?.availableQuantity ?? currentQty - reservedQty,
    },
    {
      quantity: nextQty,
      availableQuantity: nextQty - reservedQty,
      averageCost: nextAverage,
    },
  );
  await writeDocumentHistory(tx, input, movementNumber);

  return {
    movementNumber,
    movementId,
    quantity: nextQty,
    averageCost: nextAverage,
    availableQuantity: nextQty - reservedQty,
  };
}

export async function postStockMovement(
  input: PostStockMovementInput,
  options: PostStockMovementOptions = {},
): Promise<PostStockMovementResult> {
  if (!input.itemId) throw new Error("itemId is required");
  if (!input.locationId) throw new Error("locationId is required");
  if (!input.createdById) throw new Error("createdById is required");
  if (input.qtyIn <= 0 && input.qtyOut <= 0) {
    throw new Error("Either qtyIn or qtyOut must be greater than zero");
  }

  if (options.tx) {
    return postStockMovementInternal(options.tx, input);
  }

  return sql.begin(async (tx) => postStockMovementInternal(tx, input));
}

export async function postOpeningStock(input: Omit<PostStockMovementInput, "movementType">, options: PostStockMovementOptions = {}) {
  return postStockMovement({ ...input, movementType: "OPENING" }, options);
}

export async function receivePurchase(input: Omit<PostStockMovementInput, "movementType">, options: PostStockMovementOptions = {}) {
  return postStockMovement({ ...input, movementType: "PURCHASE_RECEIPT" }, options);
}

export async function returnPurchase(input: Omit<PostStockMovementInput, "movementType">, options: PostStockMovementOptions = {}) {
  return postStockMovement({
    ...input,
    movementType: "PURCHASE_RETURN",
    qtyIn: 0,
    qtyOut: input.qtyIn,
  }, options);
}

export async function issueToProduction(input: Omit<PostStockMovementInput, "movementType">, options: PostStockMovementOptions = {}) {
  return postStockMovement({
    ...input,
    movementType: "PRODUCTION_ISSUE",
    qtyIn: 0,
    qtyOut: input.qtyIn,
  }, options);
}

export async function receiveProductionOutput(input: Omit<PostStockMovementInput, "movementType">, options: PostStockMovementOptions = {}) {
  return postStockMovement({ ...input, movementType: "PRODUCTION_RECEIPT" }, options);
}

export async function issueForSales(input: Omit<PostStockMovementInput, "movementType">, options: PostStockMovementOptions = {}) {
  return postStockMovement({
    ...input,
    movementType: "SALES_ISSUE",
    qtyIn: 0,
    qtyOut: input.qtyIn,
  }, options);
}

export async function receiveSalesReturn(input: Omit<PostStockMovementInput, "movementType">, options: PostStockMovementOptions = {}) {
  return postStockMovement({ ...input, movementType: "SALES_RETURN" }, options);
}

export async function postTransfer(input: {
  itemId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  unitCost: number;
  remarks?: string;
  createdById: string;
  sourceDocumentId?: string;
}, options: PostStockMovementOptions = {}) {
  const execute = async (tx: Tx) => {
    const source = await postStockMovement({
      itemId: input.itemId,
      locationId: input.fromLocationId,
      movementType: "TRANSFER_OUT",
      sourceModule: "inventory.transfer",
      sourceDocumentId: input.sourceDocumentId,
      qtyIn: 0,
      qtyOut: input.quantity,
      unitCost: input.unitCost,
      remarks: input.remarks,
      createdById: input.createdById,
    }, { tx });

    const target = await postStockMovement({
      itemId: input.itemId,
      locationId: input.toLocationId,
      movementType: "TRANSFER_IN",
      sourceModule: "inventory.transfer",
      sourceDocumentId: input.sourceDocumentId,
      qtyIn: input.quantity,
      qtyOut: 0,
      unitCost: input.unitCost,
      remarks: input.remarks,
      createdById: input.createdById,
    }, { tx });

    return { source, target };
  };

  if (options.tx) {
    return execute(options.tx);
  }

  return sql.begin(execute);
}

export async function postAdjustment(input: {
  itemId: string;
  locationId: string;
  differenceQty: number;
  unitCost: number;
  remarks?: string;
  createdById: string;
  sourceDocumentId?: string;
}, options: PostStockMovementOptions = {}) {
  if (input.differenceQty === 0) {
    return null;
  }

  return postStockMovement({
    itemId: input.itemId,
    locationId: input.locationId,
    movementType: input.differenceQty > 0 ? "ADJUSTMENT_IN" : "ADJUSTMENT_OUT",
    sourceModule: "inventory.adjustment",
    sourceDocumentId: input.sourceDocumentId,
    qtyIn: input.differenceQty > 0 ? input.differenceQty : 0,
    qtyOut: input.differenceQty < 0 ? Math.abs(input.differenceQty) : 0,
    unitCost: input.unitCost,
    remarks: input.remarks,
    createdById: input.createdById,
  }, options);
}

export async function postStockIssue(input: Omit<PostStockMovementInput, "movementType">, options: PostStockMovementOptions = {}) {
  return postStockMovement({
    ...input,
    movementType: "STORE_ISSUE",
    qtyIn: 0,
    qtyOut: input.qtyIn,
  }, options);
}

export async function postStockReturn(input: Omit<PostStockMovementInput, "movementType">, options: PostStockMovementOptions = {}) {
  return postStockMovement({ ...input, movementType: "STORE_RETURN" }, options);
}

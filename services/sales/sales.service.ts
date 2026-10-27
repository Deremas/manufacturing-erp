import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { issueForSales, receiveSalesReturn } from "@/services/inventory/inventory-posting.service";
import { getSaleableItems, type SaleableItemOption } from "@/services/master-data/priceListService";
import { applyPriceToLine, getItemPrice, resolveTransactionChannel } from "@/services/pricing/pricing.service";
import { syncPostedSaleFinance, syncPostedSalesReturnFinance } from "@/services/sales/sales-finance.service";
import { createCreditNoteForSalesReturn } from "@/services/sales/credit-note.service";
import { syncSalesInvoiceBalance } from "@/services/sales/accounts-receivable.service";
import { syncSalesOrderProgress } from "@/services/sales/sales-order-allocation.service";
import {
  getSalesDefaultCurrency,
  nextSalesDocumentNumber,
  normalizeSalesChannel,
  writeSalesAudit,
  writeSalesHistory,
  type SalesChannel,
  type Tx,
} from "@/services/sales/sales-shared.service";

type PaymentMethod = "CASH" | "BANK" | "CHEQUE" | "MOBILE_MONEY";

export interface PointOfSaleCatalogItem {
  id: string;
  itemCode: string;
  itemName: string;
  unitId?: string;
  uomCode?: string;
  uomName?: string;
  label: string;
  availableQty: number;
  unitPrice: number | null;
  currency: string;
  channel: SalesChannel;
  priceListId?: string;
  priceListItemId?: string;
  priceListCode?: string;
  priceListName?: string;
  priceMissing: boolean;
  priceError?: string;
}

export interface CreateSaleLineInput {
  itemId: string;
  quantity: number;
  remarks?: string;
}

export interface CreateSaleInput {
  saleDate: string;
  locationId: string;
  customerId?: string | null;
  agentId?: string | null;
  truckId?: string | null;
  tripId?: string | null;
  routeName?: string | null;
  channel?: string | null;
  paymentMethod: PaymentMethod;
  bankAccountId?: string | null;
  referenceNo?: string | null;
  notes?: string | null;
  lines: CreateSaleLineInput[];
}

export interface CreateSalesReturnInput {
  saleId?: string | null;
  returnDate: string;
  locationId: string;
  customerId?: string | null;
  reason?: string | null;
  lines: Array<{
    saleItemId?: string | null;
    itemId: string;
    unitId?: string | null;
    quantity: number;
    unitPrice: number;
    reason?: string | null;
  }>;
}

export interface SalesListRow {
  id: string;
  publicId: number;
  saleNo: string;
  saleDate: string;
  channel: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  customerId?: string;
  customerCode?: string;
  customerName?: string;
  agentId?: string;
  truckId?: string;
  truckLabel?: string;
  tripId?: string;
  tripLabel?: string;
  routeName?: string;
  paymentMethod?: string;
  paymentStatus: string;
  status: string;
  itemCount: number;
  totalAmount: number;
  postedAt?: string;
}

export interface SaleDetail extends SalesListRow {
  notes?: string;
  items: Array<{
    id: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    unitId?: string;
    uomCode?: string;
    uomName?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    priceListId: string;
    priceListItemId: string;
    inventoryMovementId?: string;
    remarks?: string;
  }>;
  payments: Array<{
    id: string;
    paymentDate: string;
    paymentMethod: string;
    amount: number;
    referenceNo?: string;
    status: string;
  }>;
}

type FleetVehicleRow = {
  id: string;
  vehicleCode: string;
  vehicleName: string;
  plateNumber: string;
  isActive: boolean;
};

type FleetTripRow = {
  id: string;
  tripNo: string;
  routeName: string;
  vehicleId: string;
  driverId: string | null;
  status: string;
  isActive: boolean;
};

export interface SalesReturnListRow {
  id: string;
  publicId: number;
  returnNo: string;
  returnDate: string;
  saleId?: string;
  saleNo?: string;
  creditNoteId?: string;
  creditNoteNo?: string;
  channel: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  customerId?: string;
  customerCode?: string;
  customerName?: string;
  reason?: string;
  status: string;
  itemCount: number;
  totalAmount: number;
  postedAt?: string;
}

export interface SalesReturnDetail extends SalesReturnListRow {
  remarks?: string;
  items: Array<{
    id: string;
    saleItemId?: string;
    itemId: string;
    itemCode: string;
    itemName: string;
    unitId?: string;
    uomCode?: string;
    uomName?: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    reason?: string;
  }>;
}

interface SalesLocationScope {
  accessibleLocationIds?: string[] | null;
  channel?: string | null;
}

async function getItemLocationBalance(
  tx: Tx,
  itemId: string,
  locationId: string,
) {
  const rows = await tx<Array<{
    availableQuantity: number;
    averageCost: number;
  }>>`
    SELECT "availableQuantity", "averageCost"
    FROM "StockBalance"
    WHERE "itemId" = ${itemId}
      AND "locationId" = ${locationId}
      AND "isArchived" = false
    LIMIT 1
  `;

  return rows[0] ?? null;
}

async function getLocationChannel(
  tx: Tx | typeof sql,
  locationId: string,
  explicitChannel?: string | null,
) {
  const rows = await tx<Array<{
    id: string;
    locationCode: string;
    locationName: string;
    locationType: string | null;
    isActive: boolean;
    isQcHoldLocation: boolean;
  }>>`
    SELECT id, "locationCode", "locationName", "locationType", "isActive", "isQcHoldLocation"
    FROM "Location"
    WHERE id = ${locationId}
      AND "isArchived" = false
    LIMIT 1
  `;

  const location = rows[0];
  if (!location) {
    throw new Error("Sales location not found");
  }
  if (!location.isActive) {
    throw new Error("Sales location is inactive");
  }
  if (location.isQcHoldLocation) {
    throw new Error("Sales cannot post from a QC quarantine location");
  }

  return {
    location,
    channel: resolveTransactionChannel({
      explicitChannel,
      locationType: location.locationType,
    }),
  };
}

async function ensureCustomer(
  tx: Tx,
  customerId?: string | null,
) {
  if (!customerId) {
    return null;
  }

  const rows = await tx<Array<{ id: string; customerCode: string; name: string; isActive: boolean }>>`
    SELECT id, "customerCode", name, "isActive"
    FROM "Customer"
    WHERE id = ${customerId}
      AND "isArchived" = false
    LIMIT 1
  `;

  const customer = rows[0];
  if (!customer) {
    throw new Error("Customer not found");
  }
  if (!customer.isActive) {
    throw new Error("Selected customer is inactive");
  }
  return customer;
}

async function ensurePaymentBankAccount(
  tx: Tx,
  paymentMethod: PaymentMethod,
  bankAccountId?: string | null,
) {
  if (paymentMethod === "BANK" || paymentMethod === "CHEQUE" || paymentMethod === "MOBILE_MONEY") {
    if (!bankAccountId) {
      throw new Error("Bank account is required for the selected payment method");
    }

    const rows = await tx<Array<{ id: string; isActive: boolean }>>`
      SELECT id, "isActive"
      FROM "BankAccount"
      WHERE id = ${bankAccountId}
        AND "isArchived" = false
      LIMIT 1
    `;

    if (!rows[0]) {
      throw new Error("Selected bank account was not found");
    }
    if (!rows[0].isActive) {
      throw new Error("Selected bank account is inactive");
    }
  }
}

async function ensureFleetVehicle(
  tx: Tx,
  truckId?: string | null,
) {
  if (!truckId) {
    return null;
  }

  const rows = await tx<Array<FleetVehicleRow>>`
    SELECT id, "vehicleCode", "vehicleName", "plateNumber", "isActive"
    FROM "Vehicle"
    WHERE id = ${truckId}
      AND "isArchived" = false
    LIMIT 1
  `;

  const truck = rows[0];
  if (!truck) {
    throw new Error("Selected truck was not found");
  }
  if (!truck.isActive) {
    throw new Error("Selected truck is inactive");
  }

  return truck;
}

async function ensureFleetTrip(
  tx: Tx,
  tripId?: string | null,
) {
  if (!tripId) {
    return null;
  }

  const rows = await tx<Array<FleetTripRow>>`
    SELECT id, "tripNo", "routeName", "vehicleId", "driverId", status, "isActive"
    FROM "FleetTrip"
    WHERE id = ${tripId}
      AND "isArchived" = false
    LIMIT 1
  `;

  const trip = rows[0];
  if (!trip) {
    throw new Error("Selected trip was not found");
  }
  if (!trip.isActive) {
    throw new Error("Selected trip is inactive");
  }

  return trip;
}

export async function getPointOfSaleCatalog(input: {
  saleDate: string;
  locationId: string;
  channel?: string | null;
  customerId?: string | null;
  agentId?: string | null;
  customerGroup?: string | null;
}) {
  const saleableItems = await getSaleableItems();
  const { channel } = await getLocationChannel(sql, input.locationId, input.channel);
  const currency = await getSalesDefaultCurrency();

  const stockRows = await sql<Array<{
    itemId: string;
    availableQuantity: number;
  }>>`
    SELECT "itemId", "availableQuantity"
    FROM "StockBalance"
    WHERE "locationId" = ${input.locationId}
      AND "isArchived" = false
  `;

  const stockMap = new Map(stockRows.map((row) => [row.itemId, Number(row.availableQuantity ?? 0)]));

  const catalog = await Promise.all(
    saleableItems.map(async (item) => {
      try {
        const resolved = await getItemPrice(item.id, channel, input.saleDate, 1, {
          customerId: input.customerId,
          agentId: input.agentId,
          locationId: input.locationId,
          customerGroup: input.customerGroup,
        });

        return {
          id: item.id,
          itemCode: item.itemCode,
          itemName: item.itemName,
          unitId: item.unitId,
          uomCode: resolved.uomCode ?? item.uomCode,
          uomName: resolved.uomName ?? item.uomName,
          label: item.label,
          availableQty: Number(stockMap.get(item.id) ?? 0),
          unitPrice: resolved.unitPrice,
          currency: resolved.currency,
          channel: resolved.channel,
          priceListId: resolved.priceListId,
          priceListItemId: resolved.priceListItemId,
          priceListCode: resolved.priceListCode,
          priceListName: resolved.priceListName,
          priceMissing: false,
        } satisfies PointOfSaleCatalogItem;
      } catch (error) {
        return {
          id: item.id,
          itemCode: item.itemCode,
          itemName: item.itemName,
          unitId: item.unitId,
          uomCode: item.uomCode,
          uomName: item.uomName,
          label: item.label,
          availableQty: Number(stockMap.get(item.id) ?? 0),
          unitPrice: null,
          currency,
          channel,
          priceMissing: true,
          priceError:
            error instanceof Error
              ? error.message
              : "No active price found for this item/channel/date.",
        } satisfies PointOfSaleCatalogItem;
      }
    }),
  );

  return {
    channel,
    currency,
    items: catalog,
  };
}

export async function createPostedSale(
  input: CreateSaleInput,
  actor: { userId: string; userName: string },
) {
  if (!input.saleDate) {
    throw new Error("Sale date is required");
  }
  if (!input.locationId) {
    throw new Error("Sales location is required");
  }
  if (!input.paymentMethod) {
    throw new Error("Payment method is required");
  }
  if (!input.lines.length) {
    throw new Error("At least one sale line is required");
  }

  return sql.begin(async (tx) => {
    const { location, channel } = await getLocationChannel(tx, input.locationId, input.channel);
    const customer = await ensureCustomer(tx, input.customerId);
    const agent = await ensureCustomer(tx, input.agentId ?? (channel === "AGENT" ? input.customerId : null));
    const trip = await ensureFleetTrip(tx, input.tripId);
    const truck = await ensureFleetVehicle(tx, trip?.vehicleId ?? input.truckId);
    const routeName = String(input.routeName ?? trip?.routeName ?? "").trim() || null;

    if (channel === "AGENT" && !agent) {
      throw new Error("Agent customer is required for AGENT sales.");
    }
    if (channel === "TRUCK" && !truck) {
      throw new Error("Truck selection is required for TRUCK sales.");
    }

    await ensurePaymentBankAccount(tx, input.paymentMethod, input.bankAccountId);
    const currency = await getSalesDefaultCurrency(tx);
    const saleNo = await nextSalesDocumentNumber(tx, "POS", "Point of Sale");
    const saleId = randomUUID();

    const resolvedLines = [] as Array<{
      itemId: string;
      unitId?: string;
      priceListId: string;
      priceListItemId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      taxAmount: number;
      discountAmount: number;
      remarks?: string;
      inventoryMovementId?: string;
    }>;

    for (const line of input.lines) {
      const quantity = Number(line.quantity ?? 0);
      if (!(quantity > 0)) {
        throw new Error("Sale quantity must be greater than zero");
      }

      const price = await applyPriceToLine(
        line.itemId,
        channel,
        quantity,
        input.saleDate,
        {
          customerId: customer?.id,
          agentId: agent?.id,
          locationId: input.locationId,
        },
      );

      const balance = await getItemLocationBalance(tx, line.itemId, input.locationId);
      const availableQty = Number(balance?.availableQuantity ?? 0);
      if (availableQty < quantity) {
        throw new Error("Sale quantity cannot exceed available stock");
      }

      const movement = await issueForSales({
        itemId: line.itemId,
        locationId: input.locationId,
        sourceModule: "sales.pos",
        sourceDocumentId: saleId,
        qtyIn: quantity,
        qtyOut: 0,
        unitCost: Number(balance?.averageCost ?? 0),
        remarks: line.remarks,
        createdById: actor.userId,
      }, { tx });

      resolvedLines.push({
        itemId: line.itemId,
        unitId: price.unitId,
        priceListId: price.priceListId,
        priceListItemId: price.priceListItemId,
        quantity,
        unitPrice: price.unitPrice,
        lineTotal: price.lineTotal,
        taxAmount: 0,
        discountAmount: 0,
        remarks: line.remarks,
        inventoryMovementId: movement.movementId,
      });
    }

    const subtotal = resolvedLines.reduce((sum, line) => sum + line.lineTotal, 0);
    const totalAmount = Number(subtotal.toFixed(2));

    await tx`
      INSERT INTO "Sale" (
        id, "saleNo", "saleDate", channel, "locationId", "customerId", "agentId", "truckId", "tripId", "routeName", status,
        subtotal, "taxAmount", "discountAmount", "totalAmount", "paymentStatus",
        "paymentMethod", "bankAccountId", "referenceNo", notes, "createdById", "postedById",
        "postedAt", "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${saleId},
        ${saleNo},
        ${input.saleDate}::timestamptz,
        ${channel},
        ${location.id},
        ${customer?.id ?? null},
        ${agent?.id ?? null},
        ${truck?.id ?? null},
        ${trip?.id ?? null},
        ${routeName},
        'POSTED',
        ${subtotal},
        0,
        0,
        ${totalAmount},
        'PAID',
        ${input.paymentMethod}::"PaymentMethod",
        ${input.bankAccountId ?? null},
        ${input.referenceNo ?? null},
        ${input.notes ?? null},
        ${actor.userId},
        ${actor.userId},
        NOW(),
        false,
        NOW(),
        NOW()
      )
    `;

    for (const line of resolvedLines) {
      await tx`
        INSERT INTO "SaleItem" (
          id, "saleId", "itemId", "unitId", "priceListId", "priceListItemId", quantity,
          "unitPrice", "lineTotal", "taxAmount", "discountAmount", "inventoryMovementId",
          remarks, "createdAt", "updatedAt"
        )
        VALUES (
          ${randomUUID()},
          ${saleId},
          ${line.itemId},
          ${line.unitId ?? null},
          ${line.priceListId},
          ${line.priceListItemId},
          ${line.quantity},
          ${line.unitPrice},
          ${line.lineTotal},
          ${line.taxAmount},
          ${line.discountAmount},
          ${line.inventoryMovementId ?? null},
          ${line.remarks ?? null},
          NOW(),
          NOW()
        )
      `;
    }

    await tx`
      INSERT INTO "SalesPayment" (
        id, "saleId", "paymentDate", "paymentMethod", "bankAccountId", amount, "referenceNo",
        status, "createdById", "isArchived", "createdAt"
      )
      VALUES (
        ${randomUUID()},
        ${saleId},
        ${input.saleDate}::timestamptz,
        ${input.paymentMethod}::"PaymentMethod",
        ${input.bankAccountId ?? null},
        ${totalAmount},
        ${input.referenceNo ?? null},
        'POSTED',
        ${actor.userId},
        false,
        NOW()
      )
    `;

    await syncPostedSaleFinance(tx, {
      saleId,
      userId: actor.userId,
    });

    await writeSalesAudit(tx, actor.userId, "sales.pos", "CREATE_POST", saleId, {
      saleNo,
      saleDate: input.saleDate,
      channel,
      locationId: input.locationId,
      customerId: customer?.id ?? null,
      agentId: agent?.id ?? null,
      truckId: truck?.id ?? null,
      tripId: trip?.id ?? null,
      routeName,
      totalAmount,
      currency,
      lineCount: resolvedLines.length,
    });
    await writeSalesHistory(
      tx,
      "sales.sale",
      saleId,
      "POSTED",
      actor.userId,
      `POS sale ${saleNo} posted for ${location.locationCode} - ${location.locationName}`,
    );

    return {
      id: saleId,
      saleNo,
      totalAmount,
      currency,
      channel,
      lineCount: resolvedLines.length,
    };
  });
}

export async function createPostedSalesReturn(
  input: CreateSalesReturnInput,
  actor: { userId: string; userName: string },
) {
  if (!input.returnDate) {
    throw new Error("Return date is required");
  }
  if (!input.locationId) {
    throw new Error("Return location is required");
  }
  if (!input.lines.length) {
    throw new Error("At least one return line is required");
  }

  return sql.begin(async (tx) => {
    const { location, channel } = await getLocationChannel(tx, input.locationId);
    const customer = await ensureCustomer(tx, input.customerId);
    const saleRows = input.saleId
      ? await tx<Array<{ id: string; salesOrderId: string | null }>>`
        SELECT id, "salesOrderId"
        FROM "Sale"
        WHERE id = ${input.saleId}
          AND "isArchived" = false
        LIMIT 1
      `
      : [];
    const linkedSale = saleRows[0] ?? null;
    const invoiceRows = input.saleId
      ? await tx<Array<{ id: string; invoiceNo: string }>>`
        SELECT id, "invoiceNo"
        FROM "SalesInvoice"
        WHERE "saleId" = ${input.saleId}
          AND "isArchived" = false
        LIMIT 1
      `
      : [];
    const linkedInvoice = invoiceRows[0] ?? null;
    const returnNo = await nextSalesDocumentNumber(tx, "SRET", "Sales Return");
    const returnId = randomUUID();
    let totalAmount = 0;
    const createdItems: Array<{
      salesReturnItemId: string;
      itemId: string;
      unitId?: string | null;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      reason?: string | null;
    }> = [];

    await tx`
      INSERT INTO "SalesReturn" (
        id, "returnNo", "returnDate", "saleId", "salesOrderId", channel, "locationId", "customerId",
        reason, status, "totalAmount", "createdById", "postedById", "postedAt",
        remarks, "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${returnId},
        ${returnNo},
        ${input.returnDate}::timestamptz,
        ${input.saleId ?? null},
        ${linkedSale?.salesOrderId ?? null},
        ${channel},
        ${location.id},
        ${customer?.id ?? null},
        ${input.reason ?? null},
        'POSTED',
        0,
        ${actor.userId},
        ${actor.userId},
        NOW(),
        ${input.reason ?? null},
        false,
        NOW(),
        NOW()
      )
    `;

    for (const line of input.lines) {
      const quantity = Number(line.quantity ?? 0);
      if (!(quantity > 0)) {
        throw new Error("Return quantity must be greater than zero");
      }

      const lineTotal = Number((Number(line.unitPrice ?? 0) * quantity).toFixed(2));
      totalAmount += lineTotal;
      const saleItemRows = line.saleItemId
        ? await tx<Array<{ id: string; salesOrderItemId: string | null }>>`
          SELECT id, "salesOrderItemId"
          FROM "SaleItem"
          WHERE id = ${line.saleItemId}
          LIMIT 1
        `
        : [];
      const linkedSaleItem = saleItemRows[0] ?? null;

      await receiveSalesReturn({
        itemId: line.itemId,
        locationId: input.locationId,
        sourceModule: "sales.return",
        sourceDocumentId: returnId,
        qtyIn: quantity,
        qtyOut: 0,
        unitCost: Number(line.unitPrice ?? 0),
        remarks: line.reason ?? undefined,
        createdById: actor.userId,
      }, { tx });

      const salesReturnItemId = randomUUID();
      await tx`
        INSERT INTO "SalesReturnItem" (
          id, "returnId", "saleItemId", "salesOrderItemId", "itemId", "unitId", quantity, "unitPrice",
          "lineTotal", reason, "createdAt", "updatedAt"
        )
        VALUES (
          ${salesReturnItemId},
          ${returnId},
          ${line.saleItemId ?? null},
          ${linkedSaleItem?.salesOrderItemId ?? null},
          ${line.itemId},
          ${line.unitId ?? null},
          ${quantity},
          ${line.unitPrice},
          ${lineTotal},
          ${line.reason ?? null},
          NOW(),
          NOW()
        )
      `;
      createdItems.push({
        salesReturnItemId,
        itemId: line.itemId,
        unitId: line.unitId ?? null,
        quantity,
        unitPrice: Number(line.unitPrice ?? 0),
        lineTotal,
        reason: line.reason ?? null,
      });
    }

    await tx`
      UPDATE "SalesReturn"
      SET "totalAmount" = ${Number(totalAmount.toFixed(2))},
          "updatedAt" = NOW()
      WHERE id = ${returnId}
    `;

    const creditNote = await createCreditNoteForSalesReturn(tx, {
      salesReturnId: returnId,
      saleId: input.saleId ?? null,
      salesOrderId: linkedSale?.salesOrderId ?? null,
      salesInvoiceId: linkedInvoice?.id ?? null,
      customerId: customer?.id ?? null,
      channel,
      locationId: location.id,
      creditDate: input.returnDate,
      totalAmount: Number(totalAmount.toFixed(2)),
      reason: input.reason ?? null,
      remarks: input.reason ?? null,
      createdById: actor.userId,
      postedById: actor.userId,
      items: createdItems,
    });
    if (linkedInvoice?.id) {
      await syncSalesInvoiceBalance(tx, linkedInvoice.id);
    }

    await syncPostedSalesReturnFinance(tx, {
      returnId,
      userId: actor.userId,
    });
    if (linkedSale?.salesOrderId) {
      await syncSalesOrderProgress(tx, linkedSale.salesOrderId);
    }

    await writeSalesAudit(tx, actor.userId, "sales.return", "CREATE_POST", returnId, {
      returnNo,
      creditNoteId: creditNote.id,
      creditNoteNo: creditNote.creditNoteNo,
      channel,
      totalAmount: Number(totalAmount.toFixed(2)),
    });
    await writeSalesHistory(tx, "sales.return", returnId, "POSTED", actor.userId, `Sales return ${returnNo} posted`);
    await writeSalesHistory(tx, "sales.credit-note", creditNote.id, "POSTED", actor.userId, `Credit note ${creditNote.creditNoteNo} issued from sales return ${returnNo}`);

    return {
      id: returnId,
      returnNo,
      creditNoteId: creditNote.id,
      creditNoteNo: creditNote.creditNoteNo,
      totalAmount: Number(totalAmount.toFixed(2)),
      channel,
    };
  });
}

export async function listSales(scope: SalesLocationScope = {}): Promise<SalesListRow[]> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return [];
  }

  const normalizedChannel = scope.channel ? normalizeSalesChannel(scope.channel) : null;

  const rows = await sql<Array<{
    id: string;
    saleNo: string;
    saleDate: string;
    channel: string;
    locationId: string;
    locationCode: string;
    locationName: string;
    customerId: string | null;
    customerCode: string | null;
    customerName: string | null;
    agentId: string | null;
    truckId: string | null;
    truckCode: string | null;
    truckName: string | null;
    plateNumber: string | null;
    tripId: string | null;
    tripNo: string | null;
    routeName: string | null;
    paymentMethod: string | null;
    paymentStatus: string;
    status: string;
    itemCount: number;
    totalAmount: number;
    postedAt: string | null;
  }>>`
    SELECT
      s.id,
      s."publicId",
      s."saleNo",
      s."saleDate"::text AS "saleDate",
      s.channel,
      s."locationId",
      l."locationCode",
      l."locationName",
      s."customerId",
      c."customerCode",
      c.name AS "customerName",
      s."agentId",
      s."truckId",
      truck."vehicleCode" AS "truckCode",
      truck."vehicleName" AS "truckName",
      truck."plateNumber",
      s."tripId",
      trip."tripNo",
      s."routeName",
      s."paymentMethod"::text AS "paymentMethod",
      s."paymentStatus",
      s.status,
      COUNT(si.id)::int AS "itemCount",
      s."totalAmount",
      s."postedAt"::text AS "postedAt"
    FROM "Sale" s
    INNER JOIN "Location" l ON l.id = s."locationId"
    LEFT JOIN "Customer" c ON c.id = s."customerId"
    LEFT JOIN "Vehicle" truck ON truck.id = s."truckId"
    LEFT JOIN "FleetTrip" trip ON trip.id = s."tripId"
    LEFT JOIN "SaleItem" si ON si."saleId" = s.id
    WHERE s."isArchived" = false
      AND (${normalizedChannel}::text IS NULL OR s.channel = ${normalizedChannel})
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR s."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    GROUP BY s.id, l.id, c.id, truck.id, trip.id
    ORDER BY s."saleDate" DESC, s."createdAt" DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    publicId: Number(row.publicId),
    saleNo: row.saleNo,
    saleDate: row.saleDate,
    channel: normalizeSalesChannel(row.channel),
    locationId: row.locationId,
    locationCode: row.locationCode,
    locationName: row.locationName,
    customerId: row.customerId ?? undefined,
    customerCode: row.customerCode ?? undefined,
    customerName: row.customerName ?? undefined,
    agentId: row.agentId ?? undefined,
    truckId: row.truckId ?? undefined,
    truckLabel:
      row.truckCode && row.plateNumber
        ? `${row.truckCode} - ${row.plateNumber}`
        : row.truckCode ?? row.truckName ?? row.plateNumber ?? undefined,
    tripId: row.tripId ?? undefined,
    tripLabel: row.tripNo ?? undefined,
    routeName: row.routeName ?? undefined,
    paymentMethod: row.paymentMethod ?? undefined,
    paymentStatus: row.paymentStatus,
    status: row.status,
    itemCount: Number(row.itemCount ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
    postedAt: row.postedAt ?? undefined,
  }));
}

export async function getSaleById(id: string, scope: SalesLocationScope = {}): Promise<SaleDetail | null> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return null;
  }

  const headerRows = await sql<Array<{
    id: string;
    publicId: number;
    saleNo: string;
    saleDate: string;
    channel: string;
    locationId: string;
    locationCode: string;
    locationName: string;
    customerId: string | null;
    customerCode: string | null;
    customerName: string | null;
    agentId: string | null;
    truckId: string | null;
    truckCode: string | null;
    truckName: string | null;
    plateNumber: string | null;
    tripId: string | null;
    tripNo: string | null;
    routeName: string | null;
    paymentMethod: string | null;
    paymentStatus: string;
    status: string;
    totalAmount: number;
    postedAt: string | null;
    notes: string | null;
  }>>`
    SELECT
      s.id,
      s."publicId",
      s."saleNo",
      s."saleDate"::text AS "saleDate",
      s.channel,
      s."locationId",
      l."locationCode",
      l."locationName",
      s."customerId",
      c."customerCode",
      c.name AS "customerName",
      s."agentId",
      s."truckId",
      truck."vehicleCode" AS "truckCode",
      truck."vehicleName" AS "truckName",
      truck."plateNumber",
      s."tripId",
      trip."tripNo",
      s."routeName",
      s."paymentMethod"::text AS "paymentMethod",
      s."paymentStatus",
      s.status,
      s."totalAmount",
      s."postedAt"::text AS "postedAt",
      s.notes
    FROM "Sale" s
    INNER JOIN "Location" l ON l.id = s."locationId"
    LEFT JOIN "Customer" c ON c.id = s."customerId"
    LEFT JOIN "Vehicle" truck ON truck.id = s."truckId"
    LEFT JOIN "FleetTrip" trip ON trip.id = s."tripId"
    WHERE ${isPublicIdParam(id) ? sql`s."publicId" = ${Number(id)}` : sql`s.id = ${id}`}
      AND s."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR s."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    LIMIT 1
  `;

  const header = headerRows[0];
  if (!header) {
    return null;
  }
  const documentId = header.id;

  const [itemRows, paymentRows] = await Promise.all([
    sql<Array<{
      id: string;
      itemId: string;
      itemCode: string;
      itemName: string;
      unitId: string | null;
      uomCode: string | null;
      uomName: string | null;
      priceListId: string;
      priceListItemId: string;
      quantity: number;
      unitPrice: number;
      lineTotal: number;
      inventoryMovementId: string | null;
      remarks: string | null;
    }>>`
      SELECT
        si.id,
        si."itemId",
        i."itemCode",
        i."itemName",
        si."unitId",
        u.code AS "uomCode",
        u.name AS "uomName",
        si."priceListId",
        si."priceListItemId",
        si.quantity,
        si."unitPrice",
        si."lineTotal",
        si."inventoryMovementId",
        si.remarks
      FROM "SaleItem" si
      INNER JOIN "Item" i ON i.id = si."itemId"
      LEFT JOIN "Unit" u ON u.id = si."unitId"
      WHERE si."saleId" = ${documentId}
      ORDER BY si."createdAt" ASC
    `,
    sql<Array<{
      id: string;
      paymentDate: string;
      paymentMethod: string;
      amount: number;
      referenceNo: string | null;
      status: string;
    }>>`
      SELECT
        id,
        "paymentDate"::text AS "paymentDate",
        "paymentMethod"::text AS "paymentMethod",
        amount,
        "referenceNo",
        status
      FROM "SalesPayment"
      WHERE "saleId" = ${documentId}
        AND "isArchived" = false
      ORDER BY "createdAt" ASC
    `,
  ]);

  return {
    id: header.id,
    publicId: Number(header.publicId),
    saleNo: header.saleNo,
    saleDate: header.saleDate,
    channel: normalizeSalesChannel(header.channel),
    locationId: header.locationId,
    locationCode: header.locationCode,
    locationName: header.locationName,
    customerId: header.customerId ?? undefined,
    customerCode: header.customerCode ?? undefined,
    customerName: header.customerName ?? undefined,
    agentId: header.agentId ?? undefined,
    truckId: header.truckId ?? undefined,
    truckLabel:
      header.truckCode && header.plateNumber
        ? `${header.truckCode} - ${header.plateNumber}`
        : header.truckCode ?? header.truckName ?? header.plateNumber ?? undefined,
    tripId: header.tripId ?? undefined,
    tripLabel: header.tripNo ?? undefined,
    routeName: header.routeName ?? undefined,
    paymentMethod: header.paymentMethod ?? undefined,
    paymentStatus: header.paymentStatus,
    status: header.status,
    itemCount: itemRows.length,
    totalAmount: Number(header.totalAmount ?? 0),
    postedAt: header.postedAt ?? undefined,
    notes: header.notes ?? undefined,
    items: itemRows.map((row) => ({
      id: row.id,
      itemId: row.itemId,
      itemCode: row.itemCode,
      itemName: row.itemName,
      unitId: row.unitId ?? undefined,
      uomCode: row.uomCode ?? undefined,
      uomName: row.uomName ?? undefined,
      quantity: Number(row.quantity ?? 0),
      unitPrice: Number(row.unitPrice ?? 0),
      lineTotal: Number(row.lineTotal ?? 0),
      priceListId: row.priceListId,
      priceListItemId: row.priceListItemId,
      inventoryMovementId: row.inventoryMovementId ?? undefined,
      remarks: row.remarks ?? undefined,
    })),
    payments: paymentRows.map((row) => ({
      id: row.id,
      paymentDate: row.paymentDate,
      paymentMethod: row.paymentMethod,
      amount: Number(row.amount ?? 0),
      referenceNo: row.referenceNo ?? undefined,
      status: row.status,
    })),
  };
}

export async function getSaleablePointOfSaleItems(): Promise<SaleableItemOption[]> {
  return getSaleableItems();
}

export async function listSalesReturns(scope: SalesLocationScope = {}): Promise<SalesReturnListRow[]> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return [];
  }

  const rows = await sql<Array<{
    id: string;
    returnNo: string;
    returnDate: string;
    saleId: string | null;
    saleNo: string | null;
    creditNoteId: string | null;
    creditNoteNo: string | null;
    channel: string;
    locationId: string;
    locationCode: string;
    locationName: string;
    customerId: string | null;
    customerCode: string | null;
    customerName: string | null;
    reason: string | null;
    status: string;
    itemCount: number;
    totalAmount: number;
    postedAt: string | null;
  }>>`
    SELECT
      sr.id,
      sr."publicId",
      sr."returnNo",
      sr."returnDate"::text AS "returnDate",
      sr."saleId",
      s."saleNo",
      scn.id AS "creditNoteId",
      scn."creditNoteNo",
      sr.channel,
      sr."locationId",
      l."locationCode",
      l."locationName",
      sr."customerId",
      c."customerCode",
      c.name AS "customerName",
      sr.reason,
      sr.status,
      COUNT(sri.id)::int AS "itemCount",
      sr."totalAmount",
      sr."postedAt"::text AS "postedAt"
    FROM "SalesReturn" sr
    INNER JOIN "Location" l ON l.id = sr."locationId"
    LEFT JOIN "Sale" s ON s.id = sr."saleId"
    LEFT JOIN "SalesCreditNote" scn ON scn."salesReturnId" = sr.id
    LEFT JOIN "Customer" c ON c.id = sr."customerId"
    LEFT JOIN "SalesReturnItem" sri ON sri."returnId" = sr.id
    WHERE sr."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR sr."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    GROUP BY sr.id, l.id, s.id, c.id
    ORDER BY sr."returnDate" DESC, sr."createdAt" DESC
  `;

  return rows.map((row) => ({
    id: row.id,
    publicId: Number(row.publicId),
    returnNo: row.returnNo,
    returnDate: row.returnDate,
    saleId: row.saleId ?? undefined,
    saleNo: row.saleNo ?? undefined,
    creditNoteId: row.creditNoteId ?? undefined,
    creditNoteNo: row.creditNoteNo ?? undefined,
    channel: normalizeSalesChannel(row.channel),
    locationId: row.locationId,
    locationCode: row.locationCode,
    locationName: row.locationName,
    customerId: row.customerId ?? undefined,
    customerCode: row.customerCode ?? undefined,
    customerName: row.customerName ?? undefined,
    reason: row.reason ?? undefined,
    status: row.status,
    itemCount: Number(row.itemCount ?? 0),
    totalAmount: Number(row.totalAmount ?? 0),
    postedAt: row.postedAt ?? undefined,
  }));
}

export async function getSalesReturnById(id: string, scope: SalesLocationScope = {}): Promise<SalesReturnDetail | null> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return null;
  }

  const headerRows = await sql<Array<{
    id: string;
    publicId: number;
    returnNo: string;
    returnDate: string;
    saleId: string | null;
    saleNo: string | null;
    creditNoteId: string | null;
    creditNoteNo: string | null;
    channel: string;
    locationId: string;
    locationCode: string;
    locationName: string;
    customerId: string | null;
    customerCode: string | null;
    customerName: string | null;
    reason: string | null;
    status: string;
    totalAmount: number;
    postedAt: string | null;
    remarks: string | null;
  }>>`
    SELECT
      sr.id,
      sr."publicId",
      sr."returnNo",
      sr."returnDate"::text AS "returnDate",
      sr."saleId",
      s."saleNo",
      scn.id AS "creditNoteId",
      scn."creditNoteNo",
      sr.channel,
      sr."locationId",
      l."locationCode",
      l."locationName",
      sr."customerId",
      c."customerCode",
      c.name AS "customerName",
      sr.reason,
      sr.status,
      sr."totalAmount",
      sr."postedAt"::text AS "postedAt",
      sr.remarks
    FROM "SalesReturn" sr
    INNER JOIN "Location" l ON l.id = sr."locationId"
    LEFT JOIN "Sale" s ON s.id = sr."saleId"
    LEFT JOIN "SalesCreditNote" scn ON scn."salesReturnId" = sr.id
    LEFT JOIN "Customer" c ON c.id = sr."customerId"
    WHERE ${isPublicIdParam(id) ? sql`sr."publicId" = ${Number(id)}` : sql`sr.id = ${id}`}
      AND sr."isArchived" = false
      AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR sr."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    LIMIT 1
  `;

  const header = headerRows[0];
  if (!header) {
    return null;
  }
  const documentId = header.id;

  const itemRows = await sql<Array<{
    id: string;
    saleItemId: string | null;
    itemId: string;
    itemCode: string;
    itemName: string;
    unitId: string | null;
    uomCode: string | null;
    uomName: string | null;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
    reason: string | null;
  }>>`
    SELECT
      sri.id,
      sri."saleItemId",
      sri."itemId",
      i."itemCode",
      i."itemName",
      sri."unitId",
      u.code AS "uomCode",
      u.name AS "uomName",
      sri.quantity,
      sri."unitPrice",
      sri."lineTotal",
      sri.reason
    FROM "SalesReturnItem" sri
    INNER JOIN "Item" i ON i.id = sri."itemId"
    LEFT JOIN "Unit" u ON u.id = sri."unitId"
    WHERE sri."returnId" = ${documentId}
    ORDER BY sri."createdAt" ASC
  `;

  return {
    id: header.id,
    publicId: Number(header.publicId),
    returnNo: header.returnNo,
    returnDate: header.returnDate,
    saleId: header.saleId ?? undefined,
    saleNo: header.saleNo ?? undefined,
    creditNoteId: header.creditNoteId ?? undefined,
    creditNoteNo: header.creditNoteNo ?? undefined,
    channel: normalizeSalesChannel(header.channel),
    locationId: header.locationId,
    locationCode: header.locationCode,
    locationName: header.locationName,
    customerId: header.customerId ?? undefined,
    customerCode: header.customerCode ?? undefined,
    customerName: header.customerName ?? undefined,
    reason: header.reason ?? undefined,
    status: header.status,
    itemCount: itemRows.length,
    totalAmount: Number(header.totalAmount ?? 0),
    postedAt: header.postedAt ?? undefined,
    remarks: header.remarks ?? undefined,
    items: itemRows.map((row) => ({
      id: row.id,
      saleItemId: row.saleItemId ?? undefined,
      itemId: row.itemId,
      itemCode: row.itemCode,
      itemName: row.itemName,
      unitId: row.unitId ?? undefined,
      uomCode: row.uomCode ?? undefined,
      uomName: row.uomName ?? undefined,
      quantity: Number(row.quantity ?? 0),
      unitPrice: Number(row.unitPrice ?? 0),
      lineTotal: Number(row.lineTotal ?? 0),
      reason: row.reason ?? undefined,
    })),
  };
}

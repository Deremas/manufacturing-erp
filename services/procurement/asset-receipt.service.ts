import { randomUUID } from "node:crypto";

import { sql } from "@/lib/db";
import {
  writeProcurementAudit,
  writeProcurementHistory,
  type Tx,
} from "@/services/procurement/procurement-shared.service";

export type AssetReceiptRecord = {
  id: string;
  assetReceiptNo: string;
  grnId: string;
  grnNo: string;
  grnItemId: string;
  itemId: string;
  itemCode: string;
  itemName: string;
  supplierId: string;
  supplierName: string;
  purchaseOrderId: string | null;
  poNo: string | null;
  receivingLocationId: string;
  receivingLocationName: string;
  receivedQty: number;
  registeredQty: number;
  remainingQty: number;
  unitCost: number;
  status: string;
  createdAt: string;
};

export type AssetRegistrationInput = {
  assetCode: string;
  assetName: string;
  assetClass: string;
  assetTypeId: string;
  assetCategoryId?: string;
  serialNumber?: string;
  model?: string;
  manufacturer?: string;
  manufactureYear?: number | null;
  locationId: string;
  departmentId?: string;
  responsibleUserId?: string;
  warrantyStart?: string;
  warrantyEnd?: string;
  purchaseCost: number;
  expectedLifeYears?: number | null;
  isProductionAsset?: boolean;
  isMaintenanceRequired?: boolean;
  criticality?: string;
  description?: string;
};

function required(value: unknown, label: string) {
  const text = String(value ?? "").trim();
  if (!text) throw new Error(`${label} is required`);
  return text;
}

function optional(value: unknown) {
  const text = String(value ?? "").trim();
  return text || null;
}

function code(value: unknown) {
  return required(value, "Asset code").toUpperCase().replace(/\s+/g, "-");
}

export async function listAssetReceiptsByGrn(grnId: string): Promise<AssetReceiptRecord[]> {
  return sql<AssetReceiptRecord[]>`
    SELECT
      ar.id,
      ar."assetReceiptNo",
      ar."grnId",
      gr."grnNo",
      ar."grnItemId",
      ar."itemId",
      i."itemCode",
      i."itemName",
      gr."supplierId",
      s.name AS "supplierName",
      gr."poId" AS "purchaseOrderId",
      po."poNo",
      gr."receivingLocationId",
      l."locationName" AS "receivingLocationName",
      ar."receivedQty",
      ar."registeredQty",
      ar."remainingQty",
      gri."unitCost",
      ar.status,
      ar."createdAt"::text
    FROM "AssetReceipt" ar
    INNER JOIN "GoodsReceipt" gr ON gr.id = ar."grnId"
    INNER JOIN "GoodsReceiptItem" gri ON gri.id = ar."grnItemId"
    INNER JOIN "Item" i ON i.id = ar."itemId"
    INNER JOIN "Supplier" s ON s.id = gr."supplierId"
    INNER JOIN "Location" l ON l.id = gr."receivingLocationId"
    LEFT JOIN "PurchaseOrder" po ON po.id = gr."poId"
    WHERE ar."grnId" = ${grnId}
    ORDER BY ar."createdAt", i."itemCode"
  `;
}

export async function registerAssetsFromReceipt(input: {
  assetReceiptId: string;
  assets: AssetRegistrationInput[];
  createdById: string;
}) {
  if (!Array.isArray(input.assets) || input.assets.length === 0) {
    throw new Error("Add at least one asset registration row");
  }

  return sql.begin(async (tx) => {
    const receipts = await tx<Array<AssetReceiptRecord>>`
      SELECT
        ar.id,
        ar."assetReceiptNo",
        ar."grnId",
        gr."grnNo",
        ar."grnItemId",
        ar."itemId",
        i."itemCode",
        i."itemName",
        gr."supplierId",
        s.name AS "supplierName",
        gr."poId" AS "purchaseOrderId",
        po."poNo",
        gr."receivingLocationId",
        l."locationName" AS "receivingLocationName",
        ar."receivedQty",
        ar."registeredQty",
        ar."remainingQty",
        gri."unitCost",
        ar.status,
        ar."createdAt"::text
      FROM "AssetReceipt" ar
      INNER JOIN "GoodsReceipt" gr ON gr.id = ar."grnId"
      INNER JOIN "GoodsReceiptItem" gri ON gri.id = ar."grnItemId"
      INNER JOIN "Item" i ON i.id = ar."itemId"
      INNER JOIN "Supplier" s ON s.id = gr."supplierId"
      INNER JOIN "Location" l ON l.id = gr."receivingLocationId"
      LEFT JOIN "PurchaseOrder" po ON po.id = gr."poId"
      WHERE ar.id = ${input.assetReceiptId}
        AND gr.status = 'POSTED'
      LIMIT 1
      FOR UPDATE OF ar
    `;
    const receipt = receipts[0];
    if (!receipt) throw new Error("Posted asset receipt not found");
    if (receipt.status === "REGISTERED" || Number(receipt.remainingQty) <= 0) {
      throw new Error("All received units have already been registered");
    }
    if (input.assets.length > Number(receipt.remainingQty)) {
      throw new Error("Registered quantity cannot exceed remaining received quantity");
    }

    const codes = input.assets.map((asset) => code(asset.assetCode));
    if (new Set(codes).size !== codes.length) {
      throw new Error("Asset codes must be unique within the registration batch");
    }
    const purchaseCost = input.assets.reduce((sum, asset) => sum + Number(asset.purchaseCost || 0), 0);
    const maximumCost = Number(receipt.unitCost) * input.assets.length;
    if (purchaseCost < 0 || purchaseCost > maximumCost + 0.01) {
      throw new Error("Allocated purchase cost cannot exceed the received line cost for the registered units");
    }

    const createdIds: string[] = [];
    for (let index = 0; index < input.assets.length; index += 1) {
      const asset = input.assets[index];
      const assetId = randomUUID();
      const assetCode = codes[index];
      const assetName = required(asset.assetName, "Asset name");
      const locationId = required(asset.locationId, "Location");
      const assetTypeId = required(asset.assetTypeId, "Asset type");
      const assetClass = required(asset.assetClass, "Asset class");

      await tx`
        INSERT INTO "Asset" (
          id, "assetCode", "assetName", "assetClass", "assetTypeId", "assetCategoryId", "itemId",
          "serialNumber", model, manufacturer, "manufactureYear", "purchaseDate", "purchaseCost", "currentBookValue",
          "locationId", "departmentId", "responsibleUserId", "supplierId", "purchaseOrderId", "grnId", "assetReceiptId",
          "warrantyStart", "warrantyEnd", "expectedLifeYears", "isProductionAsset", "isMaintenanceRequired",
          status, criticality, description, "isActive", "isArchived", "createdById", "createdAt", "updatedAt"
        ) VALUES (
          ${assetId}, ${assetCode}, ${assetName}, ${assetClass}, ${assetTypeId}, ${optional(asset.assetCategoryId)}, ${receipt.itemId},
          ${optional(asset.serialNumber)}, ${optional(asset.model)}, ${optional(asset.manufacturer)}, ${asset.manufactureYear ?? null},
          NOW(), ${Number(asset.purchaseCost || 0)}, ${Number(asset.purchaseCost || 0)}, ${locationId}, ${optional(asset.departmentId)},
          ${optional(asset.responsibleUserId)}, ${receipt.supplierId}, ${receipt.purchaseOrderId}, ${receipt.grnId}, ${receipt.id},
          ${asset.warrantyStart ? new Date(asset.warrantyStart) : null}, ${asset.warrantyEnd ? new Date(asset.warrantyEnd) : null},
          ${asset.expectedLifeYears ?? null}, ${Boolean(asset.isProductionAsset)}, ${asset.isMaintenanceRequired !== false},
          'ACTIVE', ${asset.criticality || "MEDIUM"}, ${optional(asset.description)}, true, false, ${input.createdById}, NOW(), NOW()
        )
      `;
      await tx`
        INSERT INTO "AssetHistory" (
          id, "assetId", "eventType", "referenceType", "referenceId", "eventDate", "newStatus", "newLocationId",
          "performedById", remarks, "createdAt"
        ) VALUES (
          ${randomUUID()}, ${assetId}, 'REGISTERED_FROM_GRN', 'procurement.asset-receipt', ${receipt.id}, NOW(),
          'ACTIVE', ${locationId}, ${input.createdById}, ${`Registered from ${receipt.grnNo} / ${receipt.assetReceiptNo}`}, NOW()
        )
      `;
      createdIds.push(assetId);
    }

    const registeredQty = Number(receipt.registeredQty) + input.assets.length;
    const remainingQty = Number(receipt.receivedQty) - registeredQty;
    const status = remainingQty <= 0 ? "REGISTERED" : "PARTIALLY_REGISTERED";
    await tx`
      UPDATE "AssetReceipt"
      SET "registeredQty" = ${registeredQty}, "remainingQty" = ${remainingQty}, status = ${status}, "updatedAt" = NOW()
      WHERE id = ${receipt.id}
    `;

    await writeProcurementAudit(tx as Tx, input.createdById, "procurement.asset-receipt", "REGISTER_ASSETS", receipt.id, {
      assetReceiptNo: receipt.assetReceiptNo,
      assetIds: createdIds,
      registeredQty: input.assets.length,
    });
    await writeProcurementHistory(tx as Tx, "procurement.asset-receipt", receipt.id, "REGISTER_ASSETS", input.createdById, `${input.assets.length} asset(s) registered from ${receipt.grnNo}`);
    await writeProcurementHistory(tx as Tx, "procurement.grn", receipt.grnId, "REGISTER_ASSETS", input.createdById, `${input.assets.length} asset(s) registered under ${receipt.assetReceiptNo}`);

    return { assetReceiptId: receipt.id, assetIds: createdIds, registeredQty, remainingQty, status };
  });
}

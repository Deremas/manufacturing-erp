import { NextRequest } from "next/server";

import { withShiftAction } from "@/app/api/shifts/helpers";
import {
  createProductionMaterialIssue,
  postProductionMaterialIssue,
  receiveInventoryIssueOnShift,
} from "@/services/shift/shift-material.service";
import { shiftBrowserPath } from "@/services/shift/shift-session.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return withShiftAction(async (userId) => {
    const body = await request.json();
    if (body.action === "receive-issued") {
      return receiveInventoryIssueOnShift({
        shiftSessionId: id,
        stockIssueId: String(body.stockIssueId ?? ""),
        userId,
      });
    }

    const document = await createProductionMaterialIssue({
      shiftSessionId: id,
      storeLocationId: String(body.storeLocationId ?? ""),
      productionLocationId: String(body.productionLocationId ?? body.sessionLocationId ?? ""),
      remarks: body.remarks ? String(body.remarks) : "",
      createdById: userId,
      status: body.action === "post" ? "ACTIVE" : "DRAFT",
      items: Array.isArray(body.items)
        ? body.items.map((row: Record<string, unknown>) => ({
            itemId: String(row.itemId ?? ""),
            issuedQty: Number(row.issuedQty ?? 0),
            requestedQty: Number(row.suggestedQty ?? row.issuedQty ?? 0),
            unitCost: Number(row.unitCost ?? 0),
            sourceLotNo: row.sourceLotNo ? String(row.sourceLotNo) : "",
            supplierBatchNo: row.supplierBatchNo ? String(row.supplierBatchNo) : "",
            serialNo: row.serialNo ? String(row.serialNo) : "",
            expiryDate: row.expiryDate ? String(row.expiryDate) : null,
            remarks: row.remarks ? String(row.remarks) : "",
          }))
        : [],
    });

    if (body.action === "post") {
      await postProductionMaterialIssue(document.id, userId);
    }

    return {
      id: document.id,
      redirectTo: await shiftBrowserPath(id),
    };
  });
}

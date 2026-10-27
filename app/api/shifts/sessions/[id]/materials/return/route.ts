import { NextRequest } from "next/server";

import { withShiftAction } from "@/app/api/shifts/helpers";
import {
  createProductionMaterialReturn,
  postProductionMaterialReturn,
} from "@/services/shift/shift-material.service";
import { shiftBrowserPath } from "@/services/shift/shift-session.service";

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return withShiftAction(async (userId) => {
    const body = await request.json();
    const document = await createProductionMaterialReturn({
      shiftSessionId: id,
      fromLocationId: String(body.fromLocationId ?? body.sessionLocationId ?? ""),
      toStoreLocationId: String(body.toStoreLocationId ?? ""),
      remarks: body.remarks ? String(body.remarks) : "",
      createdById: userId,
      status: body.action === "post" ? "ACTIVE" : "DRAFT",
      items: Array.isArray(body.items)
        ? body.items.map((row: Record<string, unknown>) => ({
            itemId: String(row.itemId ?? ""),
            returnedQty: Number(row.returnedQty ?? 0),
            condition: row.condition ? String(row.condition) : "GOOD",
            unitCost: Number(row.unitCost ?? 0),
            remarks: row.remarks ? String(row.remarks) : "",
          }))
        : [],
    });

    if (body.action === "post") {
      await postProductionMaterialReturn(document.id, userId);
    }

    return {
      id: document.id,
      redirectTo: await shiftBrowserPath(id),
    };
  });
}

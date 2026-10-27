import { NextRequest } from "next/server";

import { withProductionAction } from "@/app/api/production/helpers";
import { createBom } from "@/services/production/bom.service";

export async function POST(request: NextRequest) {
  return withProductionAction(async (userId) => {
    const body = await request.json();
    return createBom({
      bomName: String(body.bomName ?? ""),
      finishedGoodId: String(body.finishedGoodId ?? ""),
      outputQty: Number(body.outputQty ?? 0),
      uomId: body.uomId ? String(body.uomId) : null,
      isDefault: Boolean(body.isDefault),
      status: body.status ? String(body.status) : "ACTIVE",
      description: body.description ? String(body.description) : "",
      createdById: userId,
      updatedById: userId,
      items: Array.isArray(body.items)
        ? body.items.map((item: Record<string, unknown>) => ({
            componentItemId: String(item.componentItemId ?? ""),
            uomId: item.uomId ? String(item.uomId) : null,
            quantity: Number(item.quantity ?? 0),
            wastagePercent: Number(item.wastagePercent ?? 0),
            required: item.required !== false,
          }))
        : [],
    });
  });
}

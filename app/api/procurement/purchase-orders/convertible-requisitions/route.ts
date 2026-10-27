import { NextResponse } from "next/server";

import { withProcurementAction } from "@/app/api/procurement/helpers";
import { listConvertiblePurchaseRequisitions } from "@/services/procurement/purchase-order.service";

export async function GET() {
  return withProcurementAction(async () => {
    const items = await listConvertiblePurchaseRequisitions();
    return NextResponse.json({ items });
  }, "procurement.po.create");
}

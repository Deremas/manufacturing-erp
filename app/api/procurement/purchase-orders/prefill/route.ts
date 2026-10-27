import { NextResponse } from "next/server";

import { withProcurementAction } from "@/app/api/procurement/helpers";
import { getOrderPrefill } from "@/app/api/procurement/purchase-orders/helpers";
import { canConvertPurchaseRequisition } from "@/services/procurement/purchase-order.service";
import { getPurchaseRequisitionById } from "@/services/procurement/requisition.service";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const prKey = url.searchParams.get("prPublicId") ?? url.searchParams.get("prId");
  return withProcurementAction(async () => {
    if (!prKey) {
      return NextResponse.json({ error: "prPublicId is required" }, { status: 400 });
    }
    const requisition = await getPurchaseRequisitionById(prKey);
    if (!requisition) {
      return NextResponse.json({ error: "Purchase requisition not found" }, { status: 404 });
    }
    if (!(await canConvertPurchaseRequisition(requisition.id))) {
      return NextResponse.json(
        { error: "Purchase requisition is not available for conversion or has no remaining quantity" },
        { status: 404 },
      );
    }
    const prefill = await getOrderPrefill(requisition.id);
    if (!prefill) {
      return NextResponse.json({ error: "Approved purchase requisition not found or has no remaining items" }, { status: 404 });
    }
    return prefill;
  }, "procurement.po.create");
}

import { NextResponse } from "next/server";

import { listInventoryReportRows } from "@/services/inventory/inventory-insights.service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ report: string }> },
) {
  const { report } = await params;
  const normalized = report as "transfers" | "adjustments" | "issues" | "returns" | "requisitions";
  if (!["transfers", "adjustments", "issues", "returns", "requisitions"].includes(normalized)) {
    return NextResponse.json({ error: "Unsupported report type" }, { status: 404 });
  }

  return NextResponse.json(await listInventoryReportRows(normalized));
}

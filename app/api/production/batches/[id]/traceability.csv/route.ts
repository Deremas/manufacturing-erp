import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { checkPermission } from "@/lib/permissions/permissions";
import {
  buildProductionBatchTraceabilityCsv,
  getProductionBatchTraceability,
} from "@/services/production/production-batch.service";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkPermission(user, "production.batch.export")) return NextResponse.json({ error: "Forbidden: missing permission production.batch.export" }, { status: 403 });

  const { id } = await params;
  const batch = await getProductionBatchTraceability(id);
  if (!batch) return NextResponse.json({ error: "Production batch not found" }, { status: 404 });
  const accessibleLocationIds = user.accessibleLocationIds ?? [];
  if (accessibleLocationIds.length > 0 && !accessibleLocationIds.includes(batch.locationId)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return new NextResponse(buildProductionBatchTraceabilityCsv(batch), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="batch-traceability-${batch.batchNo.replace(/[^a-z0-9_-]/gi, "-")}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}

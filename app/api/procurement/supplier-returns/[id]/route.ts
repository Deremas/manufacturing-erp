import { NextResponse } from "next/server";

import { withProcurementAction } from "@/app/api/procurement/helpers";
import { getReturn, updateReturn } from "@/app/api/procurement/supplier-returns/helpers";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withProcurementAction(async () => {
    const document = await getReturn(id);
    if (!document) {
      return NextResponse.json({ error: "Supplier return not found" }, { status: 404 });
    }
    return document;
  });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return withProcurementAction(async (userId) => {
    const body = await request.json();
    return updateReturn(id, body as Record<string, unknown>, userId);
  });
}

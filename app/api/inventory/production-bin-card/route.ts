import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { checkPermission } from "@/lib/permissions/permissions";
import {
  getProductionBinCardRegister,
  postProductionBinCardStock,
} from "@/services/inventory/production-bin-card.service";

function parseDateFrom(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? new Date(`${trimmed}T00:00:00`) : undefined;
}

function parseDateTo(value: string | null) {
  const trimmed = value?.trim();
  return trimmed ? new Date(`${trimmed}T23:59:59.999`) : undefined;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const register = await getProductionBinCardRegister({
    itemId: searchParams.get("itemId")?.trim() || undefined,
    locationId: searchParams.get("locationId")?.trim() || undefined,
    dateFrom: parseDateFrom(searchParams.get("dateFrom")),
    dateTo: parseDateTo(searchParams.get("dateTo")),
  });
  return NextResponse.json(register);
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (
    !checkPermission(user, "inventory.adjustment.create") &&
    !checkPermission(user, "inventory.view")
  ) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json().catch(() => ({}))) as {
    itemId?: string;
    locationId?: string;
    quantity?: number | string;
    unitCost?: number | string;
    direction?: "add" | "subtract";
    remarks?: string;
    shiftCode?: string;
  };

  if (!body.itemId?.trim()) {
    return NextResponse.json({ error: "Select an item." }, { status: 400 });
  }
  if (!body.locationId?.trim()) {
    return NextResponse.json({ error: "Select a location." }, { status: 400 });
  }
  if (body.direction !== "add" && body.direction !== "subtract") {
    return NextResponse.json({ error: "Choose Add or Subtract." }, { status: 400 });
  }

  try {
    const result = await postProductionBinCardStock({
      itemId: body.itemId.trim(),
      locationId: body.locationId.trim(),
      quantity: Number(body.quantity),
      unitCost: Number(body.unitCost ?? 0),
      direction: body.direction,
      remarks: body.remarks?.trim() || undefined,
      shiftCode: body.shiftCode?.trim() || undefined,
      createdById: user.id,
    });
    return NextResponse.json({ ok: true, result });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update stock." },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import {
  deactivatePriceList,
  getPriceListById,
  updatePriceList,
} from "@/services/master-data/priceListService";

function canManagePricing(role?: string | null, permissions?: string[]) {
  const normalizedRole = String(role ?? "").trim().toLowerCase();
  return (
    normalizedRole === "admin" ||
    normalizedRole === "super admin" ||
    normalizedRole === "superadmin" ||
    Boolean(
      permissions?.includes("*") ||
        permissions?.includes("pricing.create") ||
        permissions?.includes("pricing.update") ||
        permissions?.includes("pricing.deactivate"),
    )
  );
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const item = await getPriceListById(id);
  if (!item) {
    return NextResponse.json({ error: "Price list not found" }, { status: 404 });
  }

  return NextResponse.json({ item });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManagePricing(user.role, user.permissions)) {
    return NextResponse.json(
      { error: "You do not have permission to update price lists" },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const item = await updatePriceList(id, body, user.id, user.name);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to update price list",
      },
      { status: 400 },
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManagePricing(user.role, user.permissions)) {
    return NextResponse.json(
      { error: "You do not have permission to deactivate price lists" },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    await deactivatePriceList(id, user.id, user.name);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to deactivate price list",
      },
      { status: 400 },
    );
  }
}

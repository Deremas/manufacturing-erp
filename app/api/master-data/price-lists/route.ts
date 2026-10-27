import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import {
  createPriceList,
  getPriceLists,
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
        permissions?.includes("pricing.update"),
    )
  );
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const items = await getPriceLists({
    search: searchParams.get("search") ?? undefined,
    channel: searchParams.get("channel") ?? undefined,
    isActive:
      searchParams.get("isActive") == null
        ? undefined
        : searchParams.get("isActive") === "true",
    isDefault:
      searchParams.get("isDefault") == null
        ? undefined
        : searchParams.get("isDefault") === "true",
  });

  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManagePricing(user.role, user.permissions)) {
    return NextResponse.json(
      { error: "You do not have permission to create price lists" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const item = await createPriceList(body, user.id, user.name);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to create price list",
      },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { duplicatePriceList } from "@/services/master-data/priceListService";

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

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManagePricing(user.role, user.permissions)) {
    return NextResponse.json(
      { error: "You do not have permission to duplicate price lists" },
      { status: 403 },
    );
  }

  try {
    const { id } = await params;
    const item = await duplicatePriceList(id, user.id, user.name);
    return NextResponse.json({ item });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to duplicate price list",
      },
      { status: 400 },
    );
  }
}

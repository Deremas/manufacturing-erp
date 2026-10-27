import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import {
  create,
  getAll,
} from "@/services/administration/documentNumberingService";

function isAdminRole(role?: string | null) {
  const normalized = String(role ?? "").trim().toLowerCase();
  return (
    normalized === "admin" ||
    normalized === "super admin" ||
    normalized === "superadmin"
  );
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await getAll({ isArchived: false, limit: 200 });
  return NextResponse.json({ items: result.items });
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole(user.role)) {
    return NextResponse.json(
      { error: "Only administrators can manage document numbering" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const result = await create(body, user.id, user.name);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error ?? "Failed to create document numbering configuration" },
        { status: 400 },
      );
    }

    return NextResponse.json({ item: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to create document numbering configuration",
      },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import {
  getById,
  update,
} from "@/services/administration/documentNumberingService";

function isAdminRole(role?: string | null) {
  const normalized = String(role ?? "").trim().toLowerCase();
  return (
    normalized === "admin" ||
    normalized === "super admin" ||
    normalized === "superadmin"
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
  const result = await getById(id);

  if (!result.success || !result.data) {
    return NextResponse.json(
      { error: result.error ?? "Document numbering configuration not found" },
      { status: 404 },
    );
  }

  return NextResponse.json({ item: result.data });
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
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
    const { id } = await params;
    const body = await request.json();
    const result = await update(id, body, user.id, user.name);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error ?? "Failed to update document numbering configuration" },
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
            : "Failed to update document numbering configuration",
      },
      { status: 400 },
    );
  }
}

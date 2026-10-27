import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import {
  listPaymentTerms,
  savePaymentTerms,
} from "@/services/administration/payment-terms.service";

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

  const items = await listPaymentTerms();
  return NextResponse.json({ items });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole(user.role)) {
    return NextResponse.json(
      { error: "Only administrators can update payment terms" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const items = Array.isArray(body.items) ? body.items : [];
    const saved = await savePaymentTerms(items.map((item: unknown) => String(item)));
    return NextResponse.json({ items: saved });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to save payment terms",
      },
      { status: 400 },
    );
  }
}

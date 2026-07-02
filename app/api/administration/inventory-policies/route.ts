import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import {
  listInventoryApprovalPolicies,
  saveInventoryApprovalPolicies,
  type InventoryApprovalPolicy,
} from "@/services/inventory/inventory-policy.service";

function isAdminRole(role?: string | null) {
  const normalized = String(role ?? "").trim().toLowerCase();
  return normalized === "admin" || normalized === "super admin" || normalized === "superadmin";
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const policies = await listInventoryApprovalPolicies();
  return NextResponse.json({ policies });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole(user.role)) {
    return NextResponse.json({ error: "Only administrators can update inventory approval policies" }, { status: 403 });
  }

  try {
    const body = await request.json();
    const policies = Array.isArray(body?.policies) ? (body.policies as InventoryApprovalPolicy[]) : [];
    const saved = await saveInventoryApprovalPolicies(policies);
    return NextResponse.json({ policies: saved });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to save inventory approval policies" },
      { status: 400 },
    );
  }
}

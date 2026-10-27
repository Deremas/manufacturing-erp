import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { getBankAccounts, getLocations } from "@/lib/master-data-db";
import {
  getStructured,
  update,
} from "@/services/administration/systemSettingsService";

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

  const [settingsResult, bankAccounts, locations] = await Promise.all([
    getStructured(),
    getBankAccounts(),
    getLocations(),
  ]);

  if (!settingsResult.success || !settingsResult.data) {
    return NextResponse.json(
      { error: settingsResult.error ?? "Failed to load system settings" },
      { status: 500 },
    );
  }

  return NextResponse.json({
    settings: settingsResult.data,
    bankAccounts: bankAccounts.filter((account) => account.isActive),
    locations: locations.filter((location) => location.isActive),
  });
}

export async function PUT(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isAdminRole(user.role)) {
    return NextResponse.json(
      { error: "Only administrators can update system settings" },
      { status: 403 },
    );
  }

  try {
    const body = await request.json();
    const result = await update(body, user.id, user.name);

    if (!result.success || !result.data) {
      return NextResponse.json(
        { error: result.error ?? "Failed to update system settings" },
        { status: 400 },
      );
    }

    return NextResponse.json({ settings: result.data });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to update system settings",
      },
      { status: 400 },
    );
  }
}

import { NextResponse } from "next/server";

import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { createAsset, getAssets } from "@/services/maintenance/maintenance.service";

export async function GET() {
  return withMaintenanceAction("asset.master.view", async (_userId, user) => {
    const canViewCost = user.permissions.includes("*") || user.permissions.includes("asset.master.viewCost");
    const items = (await getAssets()).map((asset) => canViewCost ? asset : { ...asset, purchaseCost: undefined, currentBookValue: undefined });
    return { items };
  });
}

export async function POST(request: Request) {
  return withMaintenanceAction("asset.master.create", async (userId, user) => {
    const body = await request.json();
    assertUserScope(user, { locationId: body.locationId, departmentId: body.departmentId });
    const item = await createAsset({ ...body, createdById: userId });
    return { item };
  });
}

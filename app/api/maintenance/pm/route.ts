import { NextResponse } from "next/server";

import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { createPreventiveMaintenancePlan, getAssets, getPreventiveMaintenancePlans } from "@/services/maintenance/maintenance.service";

export async function GET() {
  return withMaintenanceAction("maintenance.pm.view", async (_userId, user) => {
    const items = await getPreventiveMaintenancePlans();
    return { items: user.accessibleLocationIds?.length ? items.filter((item) => user.accessibleLocationIds?.includes(item.locationId)) : items };
  });
}

export async function POST(request: Request) {
  return withMaintenanceAction("maintenance.pm.create", async (_userId, user) => {
    const body = await request.json();
    const asset = (await getAssets()).find((entry) => entry.id === body.assetId);
    if (!asset) throw new Error("Asset not found");
    assertUserScope(user, { locationId: asset.locationId });
    const item = await createPreventiveMaintenancePlan(body);
    return { item };
  });
}

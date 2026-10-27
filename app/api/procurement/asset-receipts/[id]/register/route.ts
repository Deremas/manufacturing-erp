import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { checkPermission } from "@/lib/permissions/permissions";
import { registerAssetsFromReceipt } from "@/services/procurement/asset-receipt.service";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkPermission(user, "procurement.grn.registerAsset")) {
    return NextResponse.json({ error: "Forbidden: missing permission procurement.grn.registerAsset" }, { status: 403 });
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const assets = Array.isArray(body.assets) ? body.assets : [];
    const unrestricted = user.permissions.includes("*") || user.role.toLowerCase() === "admin" || !user.accessibleLocationIds?.length;
    if (!unrestricted && assets.some((asset: Record<string, unknown>) => !user.accessibleLocationIds?.includes(String(asset.locationId ?? "")))) {
      return NextResponse.json({ error: "You do not have access to one or more selected asset locations" }, { status: 403 });
    }

    return NextResponse.json(await registerAssetsFromReceipt({ assetReceiptId: id, assets, createdById: user.id }));
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Unable to register assets" }, { status: 400 });
  }
}

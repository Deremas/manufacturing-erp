import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { sql } from "@/lib/db";
import { checkPermission } from "@/lib/permissions/permissions";
import { updateAssetCategory } from "@/services/maintenance/asset-lifecycle.service";

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("asset.master.update", async (userId, user) => {
    const [{ id }, body] = await Promise.all([context.params, request.json()]);
    const existing = await sql<Array<{ isActive: boolean }>>`SELECT "isActive" FROM "AssetCategory" WHERE id = ${id} AND "isArchived" = false LIMIT 1`;
    if (!existing[0]) throw new Error("Asset category not found");
    if (existing[0].isActive && body.isActive === false && !checkPermission(user, "asset.master.deactivate")) {
      throw new Error("Forbidden: missing permission asset.master.deactivate");
    }
    return { item: await updateAssetCategory({ ...body, id, updatedById: userId }) };
  });
}

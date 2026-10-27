import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { transitionAssetLifecycle } from "@/services/maintenance/asset-lifecycle.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const body = await request.json();
  const action = String(body.action ?? "").toLowerCase();
  if (!new Set(["retire", "dispose"]).has(action)) return Response.json({ error: "Action must be retire or dispose" }, { status: 400 });
  return withMaintenanceAction(`asset.lifecycle.${action}`, async (userId) => {
    const { id } = await context.params;
    return { item: await transitionAssetLifecycle({ assetId: id, action: action as "retire" | "dispose", performedById: userId, remarks: String(body.remarks ?? "") }) };
  });
}

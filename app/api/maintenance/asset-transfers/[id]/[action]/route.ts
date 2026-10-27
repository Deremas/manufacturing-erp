import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { transitionAssetTransfer } from "@/services/maintenance/asset-lifecycle.service";

const actions = new Set(["submit", "check", "approve", "post", "reject", "cancel"]);

export async function POST(request: Request, context: { params: Promise<{ id: string; action: string }> }) {
  const { action } = await context.params;
  if (!actions.has(action)) return Response.json({ error: "Unsupported action" }, { status: 400 });
  return withMaintenanceAction(`asset.transfer.${action}`, async (userId) => {
    const [{ id }, body] = await Promise.all([context.params, request.json().catch(() => ({}))]);
    return { item: await transitionAssetTransfer({ id, action: action as "submit" | "check" | "approve" | "post" | "reject" | "cancel", performedById: userId, remarks: body.remarks }) };
  });
}

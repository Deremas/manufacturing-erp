import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { returnAssetAssignment } from "@/services/maintenance/asset-lifecycle.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withMaintenanceAction("asset.assignment.return", async (userId) => {
    const [{ id }, body] = await Promise.all([context.params, request.json()]);
    return { item: await returnAssetAssignment({ id, returnedById: userId, conditionAtReturn: body.conditionAtReturn, remarks: body.remarks }) };
  });
}

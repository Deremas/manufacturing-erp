import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { transitionMaintenanceSpareRequest } from "@/services/maintenance/maintenance.service";

const actions = new Set(["submit", "check", "approve", "reject", "cancel"]);
export async function POST(request: Request, context: { params: Promise<{ id: string; action: string }> }) {
  const { action } = await context.params;
  if (!actions.has(action)) return Response.json({ error: "Unsupported action" }, { status: 400 });
  return withMaintenanceAction(`maintenance.spareRequest.${action}`, async (userId) => {
    const [{ id }, body] = await Promise.all([context.params, request.json().catch(() => ({}))]);
    return { item: await transitionMaintenanceSpareRequest({ id, action: action as "submit" | "check" | "approve" | "reject" | "cancel", performedById: userId, remarks: body.remarks }) };
  });
}

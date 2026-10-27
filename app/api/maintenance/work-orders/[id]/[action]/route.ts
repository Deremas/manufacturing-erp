import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { transitionMaintenanceWorkOrder } from "@/services/maintenance/maintenance.service";

const actions = new Set(["submit", "check", "approve"]);
export async function POST(request: Request, context: { params: Promise<{ id: string; action: string }> }) {
  const { action } = await context.params;
  if (!actions.has(action)) return Response.json({ error: "Unsupported action" }, { status: 400 });
  return withMaintenanceAction(`maintenance.workOrder.${action}`, async (userId) => {
    const [{ id }, body] = await Promise.all([context.params, request.json().catch(() => ({}))]);
    return { item: await transitionMaintenanceWorkOrder({ id, action: action as "submit" | "check" | "approve", performedById: userId, remarks: body.remarks }) };
  });
}

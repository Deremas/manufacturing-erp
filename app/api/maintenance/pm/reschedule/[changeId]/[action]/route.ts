import { withMaintenanceAction } from "@/app/api/maintenance/helpers";
import { assertUserScope } from "@/lib/auth/api-authorization";
import { getPreventiveMaintenanceScheduleChangeScope, transitionPreventiveMaintenanceReschedule } from "@/services/maintenance/maintenance.service";

const permissionByAction = {
  check: "maintenance.pm.checkReschedule",
  approve: "maintenance.pm.approveReschedule",
  reject: "maintenance.pm.rejectReschedule",
} as const;

export async function POST(request: Request, context: { params: Promise<{ changeId: string; action: string }> }) {
  const { changeId, action } = await context.params;
  if (!(action in permissionByAction)) return Response.json({ error: "Unsupported schedule-change action" }, { status: 400 });
  const typedAction = action as keyof typeof permissionByAction;
  return withMaintenanceAction(permissionByAction[typedAction], async (userId, user) => {
    const scope = await getPreventiveMaintenanceScheduleChangeScope(changeId);
    if (!scope) throw new Error("Schedule-change request not found");
    assertUserScope(user, scope);
    const body = await request.json().catch(() => ({}));
    return { item: await transitionPreventiveMaintenanceReschedule({ changeId, action: typedAction, performedById: userId, remarks: body.remarks }) };
  });
}

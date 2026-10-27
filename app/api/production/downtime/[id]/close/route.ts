import { withApiAuthorization } from "@/lib/auth/api-authorization";
import { assertUserScope } from "@/lib/auth/scope";
import { closeDowntime, getDowntimeById } from "@/services/shift/downtime.service";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  return withApiAuthorization("production.downtime.close", async (user) => {
    const { id } = await context.params; const current = await getDowntimeById(id);
    if (!current) throw new Error("Downtime record not found"); assertUserScope(user, { locationId: String(current.locationId) });
    const body = await request.json(); await closeDowntime({ id, closedById: user.id, remarks: body.remarks });
    return { item: await getDowntimeById(id) };
  });
}

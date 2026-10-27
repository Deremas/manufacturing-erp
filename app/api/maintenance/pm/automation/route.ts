import { sql } from "@/lib/db";
import { generateDuePreventiveMaintenanceWorkOrders } from "@/services/maintenance/maintenance.service";

export async function POST(request: Request) {
  const configuredSecret = process.env.CRON_SECRET;
  if (!configuredSecret) return Response.json({ error: "PM automation is not configured" }, { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${configuredSecret}`) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const users = await sql<Array<{ id: string }>>`
    SELECT id FROM "User" WHERE "isActive"=true AND "isArchived"=false
    ORDER BY CASE WHEN role='admin' THEN 0 ELSE 1 END, "createdAt" ASC LIMIT 1
  `;
  if (!users.length) return Response.json({ error: "No active automation user is available" }, { status: 409 });
  const items = await generateDuePreventiveMaintenanceWorkOrders({ createdById: users[0].id });
  return Response.json({ generated: items.length, items, ranAt: new Date().toISOString() });
}

import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { checkPermission } from "@/lib/permissions/permissions";

export async function readProcurementActionBody(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const comment = String(body.comment ?? "").trim();
    const approverId = String(body.approverId ?? "").trim();
    return {
      comment: comment || undefined,
      approverId: approverId || undefined,
    };
  } catch {
    return {};
  }
}

export async function withProcurementAction<T>(
  action: (userId: string) => Promise<T | Response>,
  requiredPermission?: string,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (requiredPermission && !checkPermission(user, requiredPermission)) {
    return NextResponse.json({ error: `Forbidden: missing permission ${requiredPermission}` }, { status: 403 });
  }

  try {
    const result = await action(user.id);
    if (result instanceof Response) {
      return result;
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Procurement API failure", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Procurement request failed" },
      { status: 500 },
    );
  }
}

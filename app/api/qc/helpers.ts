import { NextResponse } from "next/server";

import { getCurrentUser, type User } from "@/lib/auth/auth";
import { checkPermission } from "@/lib/permissions/permissions";

export async function withQcUser<T>(
  action: (user: User) => Promise<T | Response>,
  requiredPermission?: string,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (requiredPermission && !checkPermission(user, requiredPermission)) {
    return NextResponse.json(
      { error: `Forbidden: missing permission ${requiredPermission}` },
      { status: 403 },
    );
  }

  try {
    const result = await action(user);
    if (result instanceof Response) {
      return result;
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("QC API failure", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "QC request failed" },
      { status: 500 },
    );
  }
}

export async function withQcAction<T>(
  action: (userId: string) => Promise<T | Response>,
  requiredPermission?: string,
) {
  return withQcUser((user) => action(user.id), requiredPermission);
}

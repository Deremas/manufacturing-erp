import { NextResponse } from "next/server";

import { getCurrentUser, type User } from "@/lib/auth/auth";
import { checkPermission } from "@/lib/permissions/permissions";
import { assertUserScope, type ApiScope } from "@/lib/auth/scope";

export { assertUserScope } from "@/lib/auth/scope";
export type { ApiScope } from "@/lib/auth/scope";

export async function withApiAuthorization<T>(permission: string, action: (user: User) => Promise<T | Response>, scope: ApiScope = {}) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!checkPermission(user, permission)) return NextResponse.json({ error: `Forbidden: missing permission ${permission}` }, { status: 403 });
  try {
    assertUserScope(user, scope);
    const result = await action(user);
    return result instanceof Response ? result : NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Request failed";
    return NextResponse.json({ error: message }, { status: message.startsWith("Forbidden") ? 403 : 400 });
  }
}

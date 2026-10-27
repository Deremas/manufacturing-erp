import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";

export async function withShiftAction<T>(
  action: (userId: string) => Promise<T | Response>,
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await action(user.id);
    if (result instanceof Response) {
      return result;
    }
    return NextResponse.json(result);
  } catch (error) {
    console.error("Shift API failure", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Shift request failed" },
      { status: 500 },
    );
  }
}

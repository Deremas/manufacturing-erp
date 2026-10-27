import { NextResponse } from "next/server";

import { getCurrentUser } from "@/lib/auth/auth";
import { canAccessApprovalInbox } from "@/lib/permissions/ui-access";
import { listApprovalInboxItems } from "@/services/approval/approval-inbox.service";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const permissions = user.permissions ?? [];
  if (!canAccessApprovalInbox(permissions)) {
    return NextResponse.json({ count: 0 });
  }

  const items = await listApprovalInboxItems(permissions, user.id);
  return NextResponse.json({ count: items.length });
}

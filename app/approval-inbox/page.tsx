import { redirect } from "next/navigation";

import { ApprovalInboxPage } from "@/features/approval/ApprovalInboxPage";
import { getCurrentUser } from "@/lib/auth/auth";
import { canAccessApprovalInbox } from "@/lib/permissions/ui-access";
import { listApprovalInboxItems } from "@/services/approval/approval-inbox.service";

export const dynamic = "force-dynamic";

export default async function ApprovalInboxRoutePage() {
  const user = await getCurrentUser();
  const permissions = user?.permissions ?? [];

  if (!user || !canAccessApprovalInbox(permissions)) {
    redirect("/dashboard?error=forbidden");
  }

  const rows = await listApprovalInboxItems(permissions, user.id);

  return <ApprovalInboxPage rows={rows} />;
}

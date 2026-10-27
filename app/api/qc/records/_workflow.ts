import { NextRequest, NextResponse } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { checkPermission } from "@/lib/permissions/permissions";
import { getQcCatalogEntry } from "@/services/qc/qc-catalog";
import {
  approveQcTestRecord,
  cancelQcTestRecord,
  checkQcTestRecord,
  getQcTestRecord,
  rejectQcTestRecord,
  submitQcTestRecord,
} from "@/services/qc/qc-record.service";

async function run(id: string, action: "submit" | "check" | "approve" | "reject" | "cancel", request?: NextRequest) {
  return withQcUser(async (user) => {
    const current = await getQcTestRecord(id, { accessibleLocationIds: user.accessibleLocationIds });
    if (!current) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const resource = getQcCatalogEntry(String(current.slug ?? ""))?.resource;
    const permission = resource ? `qc.${resource}.${action === "cancel" ? "update" : action}` : "qc.view";
    if (!checkPermission(user, permission) && !checkPermission(user, `qc.${resource}.approve`)) {
      return NextResponse.json({ error: `Forbidden: missing permission ${permission}` }, { status: 403 });
    }
    const scope = { accessibleLocationIds: user.accessibleLocationIds, permissions: user.permissions };
    if (action === "submit") return submitQcTestRecord(id, user.id, scope);
    if (action === "check") return checkQcTestRecord(id, user.id, scope);
    if (action === "approve") return approveQcTestRecord(id, user.id, scope);
    if (action === "cancel") return cancelQcTestRecord(id, user.id, scope);
    const body = await request?.json().catch(() => ({ remarks: "" }));
    return rejectQcTestRecord(id, user.id, String(body.remarks ?? ""), scope);
  });
}

export { run as runQcRecordWorkflow };

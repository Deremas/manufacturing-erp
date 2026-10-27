import { NextRequest, NextResponse } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { getQcCatalogEntry } from "@/services/qc/qc-catalog";
import { getQcTestRecord, updateQcTestRecord } from "@/services/qc/qc-record.service";
import { checkPermission } from "@/lib/permissions/permissions";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcUser(async (user) => {
    const record = await getQcTestRecord(id, { accessibleLocationIds: user.accessibleLocationIds });
    if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const permission = `qc.${getQcCatalogEntry(String(record.slug ?? ""))?.resource ?? "view"}.view`;
    if (!checkPermission(user, permission)) {
      return NextResponse.json({ error: `Forbidden: missing permission ${permission}` }, { status: 403 });
    }
    return record;
  });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  const permission = `qc.${getQcCatalogEntry(String(body.slug ?? ""))?.resource ?? "view"}.update`;
  return withQcUser(async (user) => {
    return updateQcTestRecord(id, body, user.id, { accessibleLocationIds: user.accessibleLocationIds, permissions: user.permissions });
  }, permission);
}

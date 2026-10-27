import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { getQcCatalogEntry } from "@/services/qc/qc-catalog";
import { createQcTestRecord, listQcTestRecords } from "@/services/qc/qc-record.service";

function permission(slug: string, action: string) {
  const entry = getQcCatalogEntry(slug);
  return entry ? `qc.${entry.resource}.${action}` : "qc.view";
}

export async function GET(request: NextRequest) {
  const slug = request.nextUrl.searchParams.get("slug") ?? "";
  return withQcUser(async (user) => {
    return listQcTestRecords(slug, {
      dateFrom: request.nextUrl.searchParams.get("dateFrom"),
      dateTo: request.nextUrl.searchParams.get("dateTo"),
      shiftCode: request.nextUrl.searchParams.get("shiftCode"),
      itemId: request.nextUrl.searchParams.get("itemId"),
      samplePointId: request.nextUrl.searchParams.get("samplePointId"),
      supplierId: request.nextUrl.searchParams.get("supplierId"),
      result: request.nextUrl.searchParams.get("result"),
      status: request.nextUrl.searchParams.get("status"),
    }, { accessibleLocationIds: user.accessibleLocationIds, permissions: user.permissions });
  }, permission(slug, "view"));
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const slug = String(body.slug ?? "");
  return withQcUser(async (user) => {
    const record = await createQcTestRecord(body, user.id, { accessibleLocationIds: user.accessibleLocationIds, permissions: user.permissions });
    return record;
  }, permission(slug, "create"));
}

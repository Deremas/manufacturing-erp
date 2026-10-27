import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { listDailyQcRecords } from "@/services/qc/qc-record.service";

export async function GET(request: NextRequest) {
  return withQcUser(async (user) => listDailyQcRecords({
    date: request.nextUrl.searchParams.get("date"),
    shiftCode: request.nextUrl.searchParams.get("shiftCode"),
    locationId: request.nextUrl.searchParams.get("locationId"),
    itemId: request.nextUrl.searchParams.get("itemId"),
    slug: request.nextUrl.searchParams.get("slug"),
    status: request.nextUrl.searchParams.get("status"),
    result: request.nextUrl.searchParams.get("result"),
  }, { accessibleLocationIds: user.accessibleLocationIds }), "qc.daily.view");
}

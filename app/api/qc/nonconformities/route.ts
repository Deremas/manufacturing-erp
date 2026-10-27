import { NextRequest } from "next/server";

import { withQcAction } from "@/app/api/qc/helpers";
import { createNonconformity } from "@/services/qc/nonconformity.service";

export async function POST(request: NextRequest) {
  return withQcAction(
    async (createdById) => createNonconformity({ ...(await request.json()), createdById }),
    "qc.nc.manage",
  );
}

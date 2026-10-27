import { NextRequest } from "next/server";

import { withQcAction } from "@/app/api/qc/helpers";
import { configureQcLocations, createProductionStage, createQcTemplate, createQcTestType, mapQcTestToStage } from "@/services/qc/qc-setup.service";

export async function POST(request: NextRequest) {
  return withQcAction(async (userId) => {
    const body = await request.json();
    const entity = String(body.entity ?? "");
    if (entity === "stage") return createProductionStage({ ...body, userId, sequence: Number(body.sequence ?? 0) });
    if (entity === "test-type") return createQcTestType({ ...body, userId });
    if (entity === "template") return createQcTemplate({ ...body, userId, parameters: Array.isArray(body.parameters) ? body.parameters : [] });
    if (entity === "mapping") return mapQcTestToStage({ ...body, userId, sequence: Number(body.sequence ?? 0) });
    if (entity === "locations") return configureQcLocations({ ...body, userId });
    throw new Error("Unsupported QC setup entity");
  }, "qc.setup.manage");
}

import { NextRequest } from "next/server";

import { withQcAction } from "@/app/api/qc/helpers";
import { setQcSetupRecordState, updateQcSetupRecord } from "@/services/qc/qc-setup.service";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ entity: string; id: string }> }) {
  const { entity, id } = await params;
  return withQcAction(async (userId) => {
    const body = await request.json();
    if (["activate", "deactivate", "archive"].includes(String(body.action))) {
      return setQcSetupRecordState({ entity: entity as "stage" | "test-type" | "template" | "mapping", id, action: body.action, userId });
    }
    if (entity === "mapping") throw new Error("Mappings are changed through the stage mapping form");
    return updateQcSetupRecord({ entity: entity as "stage" | "test-type" | "template", id, code: body.code, name: body.name, sequence: body.sequence, description: body.description, userId });
  }, "qc.setup.manage");
}

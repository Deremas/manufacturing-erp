import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { upsertQcItemSpecification } from "@/services/qc/qc-master.service";

export async function PUT(request: NextRequest) {
  const body = await request.json();
  return withQcUser(async () => {
    const id = await upsertQcItemSpecification({
      itemId: String(body.itemId ?? ""),
      kind: body.kind ? String(body.kind) : "PREFORM",
      label: body.label ? String(body.label) : null,
      gramMin: body.gramMin === "" || body.gramMin == null ? null : Number(body.gramMin),
      gramMax: body.gramMax === "" || body.gramMax == null ? null : Number(body.gramMax),
      notes: body.notes ? String(body.notes) : null,
      isActive: body.isActive !== false,
    });
    return { ok: true, id };
  }, "qc.setup.update");
}

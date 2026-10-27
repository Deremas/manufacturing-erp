import { NextRequest } from "next/server";
import { withQcAction } from "@/app/api/qc/helpers";
import { updateNonconformityAction } from "@/services/qc/nonconformity.service";
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; return withQcAction(async (userId) => updateNonconformityAction({ ...(await request.json()), id, userId }), "qc.nc.manage"); }

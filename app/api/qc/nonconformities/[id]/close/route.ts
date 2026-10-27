import { NextRequest } from "next/server";
import { withQcAction } from "@/app/api/qc/helpers";
import { closeNonconformity } from "@/services/qc/nonconformity.service";
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) { const { id } = await params; const body = await request.json(); return withQcAction((userId) => closeNonconformity(id, userId, String(body.correctiveAction || ""), String(body.reinspectionResult || "")), "qc.nc.manage"); }

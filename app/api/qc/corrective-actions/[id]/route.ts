import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { getCorrectiveAction, saveCorrectiveAction, submitCorrectiveAction } from "@/services/qc/qc-quality-system.service";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcUser(async () => getCorrectiveAction(id), "qc.capa.view");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return withQcUser(async (user) => ({ id: await saveCorrectiveAction(body, user.id, id) }), "qc.capa.update");
}

export async function POST(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcUser(async () => submitCorrectiveAction(id), "qc.capa.update");
}

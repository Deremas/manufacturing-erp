import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { getManagementReview, saveManagementReview, submitManagementReview } from "@/services/qc/qc-quality-system.service";

export async function GET(_: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcUser(async () => getManagementReview(id), "qc.review.view");
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await request.json();
  return withQcUser(async (user) => ({ id: await saveManagementReview(body, user.id, id) }), "qc.review.update");
}

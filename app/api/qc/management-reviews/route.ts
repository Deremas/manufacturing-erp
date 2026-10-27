import { NextRequest } from "next/server";

import { withQcUser } from "@/app/api/qc/helpers";
import { listManagementReviews, saveManagementReview } from "@/services/qc/qc-quality-system.service";

export async function GET() {
  return withQcUser(async () => listManagementReviews(), "qc.review.view");
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  return withQcUser(async (user) => ({ id: await saveManagementReview(body, user.id) }), "qc.review.create");
}

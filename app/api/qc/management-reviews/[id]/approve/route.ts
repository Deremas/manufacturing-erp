import { withQcUser } from "@/app/api/qc/helpers";
import { approveManagementReview } from "@/services/qc/qc-quality-system.service";

export async function POST(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return withQcUser(async (user) => approveManagementReview(id, user.id), "qc.review.update");
}

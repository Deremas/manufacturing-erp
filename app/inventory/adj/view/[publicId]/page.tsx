import { renderAdjustmentDetail } from "@/features/inventory/pages/adjustment-detail";

export default async function AdjustmentViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return renderAdjustmentDetail(publicId);
}

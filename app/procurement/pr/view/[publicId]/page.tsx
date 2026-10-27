import { renderPurchaseRequisitionDetail } from "@/features/procurement/pages/pr-detail";

export default async function PurchaseRequisitionViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return renderPurchaseRequisitionDetail(publicId);
}

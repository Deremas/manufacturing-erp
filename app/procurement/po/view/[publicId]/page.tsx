import { renderPurchaseOrderDetail } from "@/features/procurement/pages/po-detail";

export default async function PurchaseOrderViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return renderPurchaseOrderDetail(publicId);
}

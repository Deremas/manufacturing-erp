import { renderGoodsReceiptDetail } from "@/features/procurement/pages/grn-detail";

export default async function GoodsReceiptViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return renderGoodsReceiptDetail(publicId);
}

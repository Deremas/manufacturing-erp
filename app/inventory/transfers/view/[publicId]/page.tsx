import { renderTransferDetail } from "@/features/inventory/pages/transfer-detail";

export default async function TransferViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return renderTransferDetail(publicId);
}

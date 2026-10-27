import { renderReturnDetail } from "@/features/inventory/pages/return-detail";

export default async function ReturnViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return renderReturnDetail(publicId);
}

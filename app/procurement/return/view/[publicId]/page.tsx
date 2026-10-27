import { renderSupplierReturnDetail } from "@/features/procurement/pages/return-detail";

export default async function SupplierReturnViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return renderSupplierReturnDetail(publicId);
}

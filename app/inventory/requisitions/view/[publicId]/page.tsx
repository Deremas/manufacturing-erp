import { renderRequisitionDetail } from "@/features/inventory/pages/requisition-detail";

export default async function RequisitionViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return renderRequisitionDetail(publicId);
}

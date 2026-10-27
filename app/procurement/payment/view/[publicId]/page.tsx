import { renderSupplierPaymentDetail } from "@/features/procurement/pages/payment-detail";

export default async function SupplierPaymentViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return renderSupplierPaymentDetail(publicId);
}

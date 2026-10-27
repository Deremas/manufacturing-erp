import { renderSupplierInvoiceDetail } from "@/features/procurement/pages/invoice-detail";

export default async function SupplierInvoiceViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const { publicId } = await params;
  return renderSupplierInvoiceDetail(publicId);
}

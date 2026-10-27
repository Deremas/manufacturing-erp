import { notFound } from "next/navigation";
import { CommercialDocumentPrint } from "@/components/sales/CommercialDocumentPrint";
import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { get as getCompanySettings } from "@/services/administration/companySettingsService";
import { getSalesQuotationById } from "@/services/sales/quotation.service";

export default async function QuotationPrintRoute({ params }: { params: Promise<{ publicId: string }> }) {
  const user = await requireAuth(); const { publicId } = await params;
  const [item, preferences, companyResult] = await Promise.all([getSalesQuotationById(publicId, { accessibleLocationIds: user.accessibleLocationIds }), getSystemPreferences(), getCompanySettings()]);
  if (!item) notFound();
  return <CommercialDocumentPrint company={companyResult.success ? companyResult.data : null} documentTitle="Sales Quotation" documentNo={item.quotationNo} documentDate={item.quotationDate} currencyCode={preferences.currencyCode} customer={`${item.customerCode} - ${item.customerName}`} channel={item.channel} location={`${item.locationCode} - ${item.locationName}`} status={item.status} remarks={item.remarks} totalAmount={item.totalAmount} lines={item.items.map((line) => ({ ...line, quantity: line.qty }))} />;
}

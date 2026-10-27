import { requireAuth } from "@/lib/auth/auth";
import { SalesInvoiceDetailPage } from "@/features/sales/SalesInvoicePages";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { getSalesInvoiceById } from "@/services/sales/sales-invoice.service";

export default async function SalesInvoiceDetailRoutePage({
  params,
  searchParams,
}: {
  params: Promise<{ publicId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { publicId } = await params;
  const query = await searchParams;
  const user = await requireAuth();
  const [invoice, preferences] = await Promise.all([
    getSalesInvoiceById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  const channel = typeof query.channel === "string" ? query.channel.toUpperCase() : "";
  const backHref = channel ? `/sales/invoices?channel=${encodeURIComponent(channel)}` : "/sales/invoices";

  return (
    <SalesInvoiceDetailPage
      invoice={invoice}
      currencyCode={preferences.currencyCode}
      backHref={backHref}
    />
  );
}

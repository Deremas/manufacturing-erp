import { requireAuth } from "@/lib/auth/auth";
import { SalesInvoiceListPage } from "@/features/sales/SalesInvoicePages";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { listSalesInvoices } from "@/services/sales/sales-invoice.service";

export default async function SalesInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const selectedChannel = typeof params.channel === "string" ? params.channel.toUpperCase() : null;

  const [items, preferences] = await Promise.all([
    listSalesInvoices({
      accessibleLocationIds: user.accessibleLocationIds,
      channel: selectedChannel,
    }),
    getSystemPreferences(),
  ]);

  return (
    <SalesInvoiceListPage
      items={items}
      currencyCode={preferences.currencyCode}
      channelFilter={selectedChannel}
    />
  );
}

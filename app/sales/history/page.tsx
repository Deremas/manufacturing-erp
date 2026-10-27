import { requireAuth } from "@/lib/auth/auth";
import { SalesHistoryPage } from "@/features/sales/SalesHistoryPage";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { listSales } from "@/services/sales/sales.service";

export default async function SalesHistoryRoutePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const user = await requireAuth();
  const params = await searchParams;
  const selectedChannel = typeof params.channel === "string" ? params.channel.toUpperCase() : null;
  const [items, preferences] = await Promise.all([
    listSales({
      accessibleLocationIds: user.accessibleLocationIds,
      channel: selectedChannel,
    }),
    getSystemPreferences(),
  ]);

  return (
    <SalesHistoryPage
      items={items}
      currencyCode={preferences.currencyCode}
      channelFilter={selectedChannel}
    />
  );
}

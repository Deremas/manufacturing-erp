import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { SalesHistoryPage } from "@/features/sales/SalesHistoryPage";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { userCanUseSalesChannel } from "@/services/sales/sales-access.service";
import { listSales } from "@/services/sales/sales.service";

export default async function AgentSalesHistoryPage() {
  const user = await requireAuth();
  if (!userCanUseSalesChannel(user, "AGENT")) {
    redirect("/sales");
  }
  const [items, preferences] = await Promise.all([
    listSales({
      accessibleLocationIds: user.accessibleLocationIds,
      channel: "AGENT",
    }),
    getSystemPreferences(),
  ]);

  return (
    <SalesHistoryPage
      items={items}
      currencyCode={preferences.currencyCode}
      title="Agent Sales History"
      subtitle="Posted AGENT channel sales with saved agent pricing snapshots and location-scoped visibility."
      breadcrumbs={[
        { label: "Sales", href: "/sales" },
        { label: "Agent Sales History" },
      ]}
      createHref="/sales/agents/sales/create"
      createLabel="Open Agent Sales"
      channelFilter="AGENT"
      detailBaseHref="/sales/agents/sales"
    />
  );
}

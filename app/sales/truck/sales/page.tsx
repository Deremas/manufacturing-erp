import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { SalesHistoryPage } from "@/features/sales/SalesHistoryPage";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { userCanUseSalesChannel } from "@/services/sales/sales-access.service";
import { listSales } from "@/services/sales/sales.service";

export default async function TruckSalesHistoryPage() {
  const user = await requireAuth();
  if (!userCanUseSalesChannel(user, "TRUCK")) {
    redirect("/sales");
  }
  const [items, preferences] = await Promise.all([
    listSales({
      accessibleLocationIds: user.accessibleLocationIds,
      channel: "TRUCK",
    }),
    getSystemPreferences(),
  ]);

  return (
    <SalesHistoryPage
      items={items}
      currencyCode={preferences.currencyCode}
      title="Truck Sales History"
      subtitle="Posted TRUCK channel sales with truck, trip, route, inventory issue, and finance posting snapshots."
      breadcrumbs={[
        { label: "Sales", href: "/sales" },
        { label: "Truck Sales History" },
      ]}
      createHref="/sales/truck"
      createLabel="Open Truck Sales"
      channelFilter="TRUCK"
      detailBaseHref="/sales/truck/sales"
    />
  );
}

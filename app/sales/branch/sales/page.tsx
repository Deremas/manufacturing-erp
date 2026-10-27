import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { SalesHistoryPage } from "@/features/sales/SalesHistoryPage";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { userCanUseSalesChannel } from "@/services/sales/sales-access.service";
import { listSales } from "@/services/sales/sales.service";

export default async function BranchSalesHistoryPage() {
  const user = await requireAuth();
  if (!userCanUseSalesChannel(user, "BRANCH")) {
    redirect("/sales");
  }
  const [items, preferences] = await Promise.all([
    listSales({
      accessibleLocationIds: user.accessibleLocationIds,
      channel: "BRANCH",
    }),
    getSystemPreferences(),
  ]);

  return (
    <SalesHistoryPage
      items={items}
      currencyCode={preferences.currencyCode}
      title="Branch Sales History"
      subtitle="Posted BRANCH channel sales scoped to locations the signed-in user is allowed to operate."
      breadcrumbs={[
        { label: "Sales", href: "/sales" },
        { label: "Branch Sales History" },
      ]}
      createHref="/sales/branch"
      createLabel="Open Branch Sales"
      channelFilter="BRANCH"
      detailBaseHref="/sales/branch/sales"
    />
  );
}

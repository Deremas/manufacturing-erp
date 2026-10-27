import { redirect } from "next/navigation";

import { ChannelSalesWorkspace } from "@/features/sales/ChannelSalesWorkspace";
import { requireAuth } from "@/lib/auth/auth";
import { getBankAccounts, getCustomers, getLocations } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { filterLocationsForUser, userCanUseSalesChannel } from "@/services/sales/sales-access.service";

export default async function BranchSalesPage() {
  const user = await requireAuth();
  if (!userCanUseSalesChannel(user, "BRANCH")) {
    redirect("/sales");
  }
  const [locations, customers, bankAccounts, preferences] = await Promise.all([
    getLocations(),
    getCustomers(),
    getBankAccounts(),
    getSystemPreferences(),
  ]);

  const branchLocations = filterLocationsForUser(user, locations, {
    locationTypes: ["BRANCH"],
  });

  return (
    <ChannelSalesWorkspace
      title="Branch Sales"
      subtitle="BRANCH channel selling with location-aware access, live branch pricing, inventory issue, and finance posting"
      contextTitle="Branch Sales Context"
      breadcrumbs={[
        { label: "Sales", href: "/sales" },
        { label: "Branch Sales" },
      ]}
      forcedChannel="BRANCH"
      postEndpoint="/api/sales"
      emptyCartMessage="Add finished goods to build a posted branch sale with saved BRANCH pricing snapshots."
      emptyCatalogMessage="Create active BRANCH channel finished-goods prices first, then they will appear here for branch selling."
      postActionLabel="Post Branch Sale"
      historyHref="/sales/history?channel=BRANCH"
      locations={branchLocations}
      customers={customers.filter((customer) => customer.isActive)}
      bankAccounts={bankAccounts.filter((account) => account.isActive)}
      currencyCode={preferences.currencyCode}
      currencyLabel={preferences.currencyLabel}
    />
  );
}

import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { getBankAccounts, getCustomers, getLocations } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { ChannelSalesWorkspace } from "@/features/sales/ChannelSalesWorkspace";
import { filterLocationsForUser, userCanUseSalesChannel } from "@/services/sales/sales-access.service";

function customerLooksLikeAgent(customer: { customerCode: string; name: string }) {
  const label = `${customer.customerCode} ${customer.name}`.toUpperCase();
  return label.includes("AGENT") || label.includes("DISTRIBUTOR");
}

export default async function AgentSalesCreatePage() {
  const user = await requireAuth();
  if (!userCanUseSalesChannel(user, "AGENT")) {
    redirect("/sales");
  }
  const [locations, customers, bankAccounts, preferences] = await Promise.all([
    getLocations(),
    getCustomers(),
    getBankAccounts(),
    getSystemPreferences(),
  ]);

  const accessibleLocations = filterLocationsForUser(user, locations);
  const activeCustomers = customers.filter((customer) => customer.isActive);
  const agentCustomers = activeCustomers.filter(customerLooksLikeAgent);

  return (
    <ChannelSalesWorkspace
      title="Agent Sales"
      subtitle="AGENT channel selling with live agent pricing, inventory issue, and finance posting"
      contextTitle="Agent Sales Context"
      breadcrumbs={[
        { label: "Sales", href: "/sales" },
        { label: "Agent Sales", href: "/sales/agents/sales" },
        { label: "Create" },
      ]}
      forcedChannel="AGENT"
      postEndpoint="/api/sales"
      emptyCartMessage="Add finished goods to build a posted agent sale with saved AGENT pricing snapshots."
      emptyCatalogMessage="Create active AGENT channel finished-goods prices first, then they will appear here for agent selling."
      postActionLabel="Post Agent Sale"
      customerLabel="Agent / Distributor"
      customerEmptyLabel="Select ..."
      historyHref="/sales/history?channel=AGENT"
      locations={accessibleLocations}
      customers={(agentCustomers.length ? agentCustomers : activeCustomers)}
      bankAccounts={bankAccounts.filter((account) => account.isActive)}
      currencyCode={preferences.currencyCode}
      currencyLabel={preferences.currencyLabel}
    />
  );
}

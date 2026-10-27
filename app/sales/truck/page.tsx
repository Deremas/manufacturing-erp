import { redirect } from "next/navigation";

import { requireAuth } from "@/lib/auth/auth";
import { getBankAccounts, getCustomers, getFleetTrips, getLocations, getVehicles } from "@/lib/master-data-db";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { ChannelSalesWorkspace } from "@/features/sales/ChannelSalesWorkspace";
import { filterLocationsForUser, userCanUseSalesChannel } from "@/services/sales/sales-access.service";

export default async function TruckSalesPage() {
  const user = await requireAuth();
  if (!userCanUseSalesChannel(user, "TRUCK")) {
    redirect("/sales");
  }
  const [locations, customers, bankAccounts, vehicles, trips, preferences] = await Promise.all([
    getLocations(),
    getCustomers(),
    getBankAccounts(),
    getVehicles(),
    getFleetTrips(),
    getSystemPreferences(),
  ]);

  const accessibleLocations = filterLocationsForUser(user, locations);

  return (
    <ChannelSalesWorkspace
      title="Truck Sales"
      subtitle="TRUCK channel selling with live price list resolution, inventory issue, and finance posting"
      contextTitle="Truck Sales Context"
      breadcrumbs={[
        { label: "Sales", href: "/sales" },
        { label: "Truck Sales" },
      ]}
      forcedChannel="TRUCK"
      postEndpoint="/api/sales"
      emptyCartMessage="Add finished goods to build a posted truck sale with saved TRUCK pricing snapshots."
      emptyCatalogMessage="Create active TRUCK channel finished-goods prices first, then they will appear here for truck selling."
      postActionLabel="Post Truck Sale"
      historyHref="/sales/history?channel=TRUCK"
      vehicles={vehicles.filter((vehicle) => vehicle.isActive)}
      trips={trips.filter((trip) => trip.isActive)}
      locations={accessibleLocations}
      customers={customers.filter((customer) => customer.isActive)}
      bankAccounts={bankAccounts.filter((account) => account.isActive)}
      currencyCode={preferences.currencyCode}
      currencyLabel={preferences.currencyLabel}
    />
  );
}

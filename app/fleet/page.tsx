import { ModuleLandingPage } from "@/components/shared";
import { navigation } from "@/lib/constants/navigation";
import { getModuleReportLinks } from "@/services/reports/report-access.service";

const fleetItem = navigation.find((item) => item.title === "Fleet");

export default function FleetRoutePage() {
  return (
    <ModuleLandingPage
      title="Fleet"
      subtitle="Vehicle, trip, fuel, and reconciliation management"
      description="Open live fleet vehicles, drivers, trips, and fuel records. Trip lifecycle, fuel expense posting, bank impact, and cross-module loading/dispatch reconciliation are now linked through real services."
      reportLinks={getModuleReportLinks("fleet")}
      links={
        fleetItem?.children?.map((child) => ({
          title: child.title,
          href: child.href,
          icon: "Truck",
        })) ?? []
      }
    />
  );
}

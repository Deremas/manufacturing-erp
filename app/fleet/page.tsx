import { ModuleLandingPage } from "@/components/shared";
import { navigation } from "@/lib/constants/navigation";

const fleetItem = navigation.find((item) => item.title === "Fleet");

export default function FleetRoutePage() {
  return (
    <ModuleLandingPage
      title="Fleet"
      subtitle="Vehicle and trip management"
      description="Open fleet vehicles, drivers, trips, and fuel records. Fleet fuel and spare-part issue/return integration can now route through inventory posting helpers."
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

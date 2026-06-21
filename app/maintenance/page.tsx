import { ModuleLandingPage } from "@/components/shared";

export default function MaintenanceRoutePage() {
  return (
    <ModuleLandingPage
      title="Maintenance"
      subtitle="Assets and work orders"
      description="Open work orders, preventive maintenance, and asset register pages."
      links={[
        { title: "Work Orders", href: "/maintenance/tickets", icon: "Wrench" },
        { title: "PM Schedule", href: "/maintenance/pm", icon: "CalendarClock" },
        { title: "Asset Register", href: "/maintenance/assets", icon: "Package" },
      ]}
    />
  );
}

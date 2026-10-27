import { ModuleLandingPage } from "@/components/shared";
import { getModuleReportLinks } from "@/services/reports/report-access.service";

export default function ProductionRoutePage() {
  return (
    <ModuleLandingPage
      title="Production"
      subtitle="Production"
      description="Shift sessions are the factory workspace. Stock, quality, maintenance, and cost stay on the shared inventory and master records."
      links={[]}
      reportLinks={getModuleReportLinks("production")}
      sections={[
        {
          title: "Operations",
          description: "Open a shift, then follow materials, output, and WIP from that shift.",
          links: [
            { title: "Shift Sessions", href: "/production/shift-sessions", icon: "CalendarClock" },
            { title: "Production Stock Balance (WIP)", href: "/production/wip", icon: "Warehouse" },
            { title: "Log Production", href: "/production/log-production", icon: "Layers" },
            { title: "Bill of Materials", href: "/production/bom", icon: "FlaskConical" },
            { title: "Cost Settings", href: "/production/cost-settings", icon: "Settings2" },
          ],
        },
      ]}
    />
  );
}

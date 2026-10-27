import { ModuleLandingPage } from "@/components/shared";
import { getModuleReportLinks } from "@/services/reports/report-access.service";

export default function InventoryRoutePage() {
  return (
    <ModuleLandingPage
      title="Inventory"
      subtitle="Stock control, transfers, and warehouse operations"
      description="Open the inventory workspaces for stock overview, bin cards, requisitions, issues, returns, transfers, adjustments, and SRV cards."
      links={[]}
      reportLinks={getModuleReportLinks("inventory")}
      sections={[
        {
          title: "Operations",
          description: "Daily warehouse transactions and stock workspaces.",
          links: [
            { title: "Stock Overview", href: "/inventory/stock", icon: "Package2" },
            { title: "Stock Movements", href: "/inventory/movements", icon: "ArrowLeftRight" },
            { title: "Bin Card", href: "/inventory/bin-card", icon: "ClipboardList" },
            { title: "Low Stock", href: "/inventory/low-stock", icon: "TriangleAlert" },
            { title: "Transfers", href: "/inventory/transfers", icon: "MoveRight" },
            { title: "Stock Adjustments", href: "/inventory/adjustments", icon: "SlidersHorizontal" },
            { title: "Store Requisitions", href: "/inventory/requisitions", icon: "FileText" },
            { title: "Stock Issues", href: "/inventory/issues", icon: "PackageMinus" },
            { title: "Stock Returns", href: "/inventory/returns", icon: "PackagePlus" },
            { title: "SRV Card", href: "/inventory/srv", icon: "ScrollText" },
          ],
        },
      ]}
    />
  );
}

import { ModuleLandingPage } from "@/components/shared";
import { navigation } from "@/lib/constants/navigation";

const inventoryItem = navigation.find((item) => item.title === "Inventory");

export default function InventoryRoutePage() {
  return (
    <ModuleLandingPage
      title="Inventory"
      subtitle="Stock control, transfers, and warehouse operations"
      description="Open the inventory workspaces for stock overview, bin cards, requisitions, issues, returns, transfers, adjustments, and SRV cards."
      links={
        [
          ...(inventoryItem?.children?.map((child) => ({
            title: child.title,
            href: child.href,
            icon: "Package2",
          })) ?? []),
          {
            title: "Production Bin Cards",
            href: "/inventory/production-bin-cards",
            icon: "Factory",
          },
        ]
      }
    />
  );
}

import { ModuleLandingPage } from "@/components/shared";
import { navigation } from "@/lib/constants/navigation";

const salesItem = navigation.find((item) => item.title === "Sales");

export default function SalesRoutePage() {
  return (
    <ModuleLandingPage
      title="Sales"
      subtitle="Order capture and fulfillment"
      description="Open POS, sales history, container tracking, and truck sales from one sales workspace. Inventory sales issue and sales return integration helpers are ready for invoice and POS posting."
      links={
        salesItem?.children?.map((child) => ({
          title: child.title,
          href: child.href,
          icon: "ShoppingBag",
        })) ?? []
      }
    />
  );
}

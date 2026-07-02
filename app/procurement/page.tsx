import { ModuleLandingPage } from "@/components/shared";
import { navigation } from "@/lib/constants/navigation";

const procurementItem = navigation.find((item) => item.title === "Procurement");

export default function ProcurementRoutePage() {
  return (
    <ModuleLandingPage
      title="Procurement"
      subtitle="Purchasing and supplier workflow"
      description="Jump into purchase requisitions, purchase orders, GRN, supplier invoices, payments, performance tracking, and commitment registers. Inventory receipt/return posting hooks are now available for GRN and supplier return workflows."
      links={
        procurementItem?.children?.map((child) => ({
          title: child.title,
          href: child.href,
          icon: "ShoppingCart",
        })) ?? []
      }
    />
  );
}

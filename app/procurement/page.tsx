import { ModuleLandingPage } from "@/components/shared";
import { getModuleReportLinks } from "@/services/reports/report-access.service";

export default function ProcurementRoutePage() {
  return (
    <ModuleLandingPage
      title="Procurement"
      subtitle="Purchasing and supplier workflow"
      description="Jump into purchase requisitions, purchase orders, GRN, supplier invoices, payments, performance tracking, and commitment registers. Inventory receipt/return posting hooks are now available for GRN and supplier return workflows."
      links={[]}
      reportLinks={getModuleReportLinks("procurement")}
      sections={[
        {
          title: "Operations",
          description: "Daily commercial and supplier documents.",
          links: [
            { title: "Purchase Requisitions", href: "/procurement/requisitions", icon: "ShoppingCart" },
            { title: "Purchase Orders", href: "/procurement/purchase-orders", icon: "ShoppingCart" },
            { title: "Goods Receipts / GRN", href: "/procurement/grn", icon: "ShoppingCart" },
            { title: "Supplier Returns", href: "/procurement/supplier-returns", icon: "ShoppingCart" },
            { title: "Supplier Invoices", href: "/procurement/supplier-invoices", icon: "ShoppingCart" },
            { title: "Supplier Payments", href: "/procurement/payments", icon: "ShoppingCart" },
          ],
        },
      ]}
    />
  );
}

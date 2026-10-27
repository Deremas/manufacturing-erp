import { ModuleLandingPage } from "@/components/shared";
import { getModuleReportLinks } from "@/services/reports/report-access.service";

export default function SalesRoutePage() {
  return (
    <ModuleLandingPage
      title="Sales"
      subtitle="Order capture and fulfillment"
      description="Run quotations, sales orders, reserve-only loading, posted dispatch, POS sales, returns, and channel reporting from one live sales workspace. Sales resolves finished-goods prices from active price lists, saves snapshot prices, issues inventory only on confirmed posting, and creates finance postings."
      links={[]}
      reportLinks={[...getModuleReportLinks("sales"), ...getModuleReportLinks("ar")]}
      sections={[
        {
          title: "Commercial Workflow",
          description: "Primary sales documents and customer-facing transactions.",
          links: [
            { title: "Quotations", href: "/sales/quotations", icon: "FileText" },
            { title: "Sales Orders", href: "/sales/orders", icon: "ClipboardCheck" },
            { title: "Point of Sale", href: "/sales/pos", icon: "ShoppingBag" },
            { title: "Loading Orders", href: "/sales/loading", icon: "PackageCheck" },
            { title: "Dispatch Register", href: "/sales/dispatch", icon: "Truck" },
            { title: "Sales Invoices", href: "/sales/invoices", icon: "ReceiptText" },
            { title: "Credit Notes", href: "/sales/credit-notes", icon: "Receipt" },
            { title: "Sales Returns", href: "/sales/returns", icon: "Undo2" },
            { title: "Accounts Receivable", href: "/sales/receivables", icon: "Landmark" },
            { title: "Customer Receipts", href: "/sales/receipts", icon: "Wallet" },
          ],
        },
        {
          title: "Channel Workspaces",
          description: "Channel-specific operational screens kept out of the sidebar for simpler daily navigation.",
          links: [
            { title: "Branch Sales", href: "/sales/branch", icon: "Store" },
            { title: "Truck Sales", href: "/sales/truck", icon: "Truck" },
            { title: "Truck Loading", href: "/sales/truck/loading", icon: "PackageCheck" },
            { title: "Agent Loading", href: "/sales/agents/loading", icon: "Users" },
            { title: "Container Tracking", href: "/sales/containers", icon: "Package2" },
          ],
        },
        {
          title: "Collections",
          description: "Customer collection and history workspaces.",
          links: [
            { title: "Collections", href: "/sales/collections", icon: "MessagesSquare" },
            { title: "Overdue Customers", href: "/sales/collections/overdue", icon: "TriangleAlert" },
            { title: "Collections Follow-ups", href: "/sales/collections/follow-ups", icon: "MessageSquareText" },
            { title: "Sales History", href: "/sales/history", icon: "History" },
          ],
        },
      ]}
    />
  );
}

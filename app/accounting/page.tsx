import { ModuleLandingPage } from "@/components/shared";
import { navigation } from "@/lib/constants/navigation";
import { getModuleReportLinks } from "@/services/reports/report-access.service";

const accountingItem = navigation.find((item) => item.title === "Accounting");

export default function AccountingRoutePage() {
  return (
    <ModuleLandingPage
      title="Accounting"
      subtitle="Ledger, journals, and trial balance"
      description="Open the chart of accounts, journals, general ledger, and trial balance screens."
      reportLinks={getModuleReportLinks("accounting")}
      links={
        accountingItem?.children?.map((child) => ({
          title: child.title,
          href: child.href,
          icon: "Calculator",
        })) ?? []
      }
    />
  );
}

import { ModuleLandingPage } from "@/components/shared";
import { navigation } from "@/lib/constants/navigation";
import { getModuleReportLinks } from "@/services/reports/report-access.service";

const financeItem = navigation.find((item) => item.title === "Finance");

export default function FinanceRoutePage() {
  return (
    <ModuleLandingPage
      title="Finance"
      subtitle="Treasury, banking, and financial reporting"
      description="Open bank accounts, cash book, expenses, aging reports, financial statements, and finance settings."
      reportLinks={getModuleReportLinks("finance")}
      links={
        financeItem?.children?.map((child) => ({
          title: child.title,
          href: child.href,
          icon: "Landmark",
        })) ?? []
      }
    />
  );
}

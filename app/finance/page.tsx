import { ModuleLandingPage } from "@/components/shared";
import { navigation } from "@/lib/constants/navigation";

const financeItem = navigation.find((item) => item.title === "Finance");

export default function FinanceRoutePage() {
  return (
    <ModuleLandingPage
      title="Finance"
      subtitle="Treasury, banking, and financial reporting"
      description="Open bank accounts, cash book, expenses, aging reports, financial statements, and finance settings."
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

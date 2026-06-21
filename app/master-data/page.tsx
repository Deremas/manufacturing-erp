import { ModuleLandingPage } from "@/components/shared";
import { navigation } from "@/lib/constants/navigation";

const moduleItem = navigation.find((item) => item.title === "Master Data");

export default function MasterDataRoutePage() {
  return (
    <ModuleLandingPage
      title="Master Data"
      subtitle="Core reference records used across the system"
      description="Manage items, categories, units, customers, suppliers, departments, bank records, price lists, and tax codes from the database-backed master data workspace."
      links={
        moduleItem?.children?.map((child) => ({
          title: child.title,
          href: child.href,
          icon: "Database",
        })) ?? []
      }
    />
  );
}

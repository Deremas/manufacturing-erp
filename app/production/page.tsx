import { ModuleLandingPage } from "@/components/shared";
import { navigation } from "@/lib/constants/navigation";

const productionItem = navigation.find((item) => item.title === "Production");

export default function ProductionRoutePage() {
  return (
    <ModuleLandingPage
      title="Production"
      subtitle="Manufacturing planning and costing"
      description="Open bills of materials, cost settings, and cost reports for production operations."
      links={
        productionItem?.children?.map((child) => ({
          title: child.title,
          href: child.href,
          icon: "FlaskConical",
        })) ?? []
      }
    />
  );
}

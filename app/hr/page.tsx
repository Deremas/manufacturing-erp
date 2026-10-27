import { ModuleLandingPage } from "@/components/shared";
import { navigation } from "@/lib/constants/navigation";
import { getModuleReportLinks } from "@/services/reports/report-access.service";

const hrItem = navigation.find((item) => item.title === "HR Management");

export default function HRRoutePage() {
  return (
    <ModuleLandingPage
      title="HR"
      subtitle="People, attendance, and payroll"
      description="Open employee, attendance, overtime, leave, payroll, and payroll settings pages."
      reportLinks={getModuleReportLinks("hr")}
      links={
        hrItem?.children?.map((child) => ({
          title: child.title,
          href: child.href,
          icon: "Users",
        })) ?? []
      }
    />
  );
}

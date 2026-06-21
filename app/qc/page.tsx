import { ModuleLandingPage } from "@/components/shared";
import { navigation } from "@/lib/constants/navigation";

const qcItem = navigation.find((item) => item.title === "QC Tests");

export default function QCRoutePage() {
  return (
    <ModuleLandingPage
      title="QC"
      subtitle="Quality control and testing"
      description="Open the water, microbial, preform, handle, and cap inspection screens."
      links={
        qcItem?.children?.map((child) => ({
          title: child.title,
          href: child.href,
          icon: "CheckCircle2",
        })) ?? []
      }
    />
  );
}

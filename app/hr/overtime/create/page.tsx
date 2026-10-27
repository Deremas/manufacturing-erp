import { requireAuth } from "@/lib/auth/auth";
import OvertimeRequestFormPage from "@/features/hr/OvertimeRequestFormPage";
import { getOvertimeReferenceData } from "@/services/hr/overtime.service";

export default async function HrOvertimeCreateRoute() {
  await requireAuth();
  const referenceData = await getOvertimeReferenceData();

  return (
    <OvertimeRequestFormPage
      employees={referenceData.employees}
      reasons={referenceData.reasons}
      shifts={referenceData.shifts}
      submitEndpoint="/api/hr/overtime"
      successHref="/hr/overtime"
    />
  );
}

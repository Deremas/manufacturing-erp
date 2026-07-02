import { QcTestsLivePage } from "@/features/qc/live-pages";
import { listQcTests } from "@/services/qc/qc.service";

export default async function PreformInspectionPage() {
  const rows = await listQcTests("preform-inspection");
  return <QcTestsLivePage title="Preform Inspection" rows={rows} />;
}

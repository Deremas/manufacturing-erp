import { QcTestsLivePage } from "@/features/qc/live-pages";
import { listQcTests } from "@/services/qc/qc.service";

export default async function CapInspectionPage() {
  const rows = await listQcTests("cap-inspection");
  return <QcTestsLivePage title="Cap Inspection" rows={rows} />;
}

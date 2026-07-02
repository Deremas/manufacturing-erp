import { QcTestsLivePage } from "@/features/qc/live-pages";
import { listQcTests } from "@/services/qc/qc.service";

export default async function HandleInspectionPage() {
  const rows = await listQcTests("handle-inspection");
  return <QcTestsLivePage title="Handle Inspection" rows={rows} />;
}

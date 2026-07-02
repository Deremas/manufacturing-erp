import { QcTestsLivePage } from "@/features/qc/live-pages";
import { listQcTests } from "@/services/qc/qc.service";

export default async function WaterTestPage() {
  const rows = await listQcTests("water-test");
  return <QcTestsLivePage title="Water Test" rows={rows} />;
}

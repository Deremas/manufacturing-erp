import { QcTestsLivePage } from "@/features/qc/live-pages";
import { listQcTests } from "@/services/qc/qc.service";

export const dynamic = "force-dynamic";

export default async function WaterLedgerPage() {
  const rows = await listQcTests("water-test");
  return <QcTestsLivePage title="Water Test" rows={rows} />;
}

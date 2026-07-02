import { QcTestsLivePage } from "@/features/qc/live-pages";
import { listQcTests } from "@/services/qc/qc.service";

export default async function MicrobialTestPage() {
  const rows = await listQcTests("microbial-test");
  return <QcTestsLivePage title="Microbial Test" rows={rows} />;
}

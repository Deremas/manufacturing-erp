import { CommitmentRegisterReportPage } from "@/features/procurement/report-pages";
import { getCommitmentRegister } from "@/services/procurement/procurement-report.service";

export default async function CommitmentRegisterPage() {
  const rows = await getCommitmentRegister();
  return <CommitmentRegisterReportPage rows={rows} />;
}

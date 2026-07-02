import { NonconformityLivePage } from "@/features/qc/live-pages";
import { listNonconformities } from "@/services/qc/nonconformity.service";

export default async function NonconformityPage() {
  const rows = await listNonconformities();
  return <NonconformityLivePage rows={rows} />;
}

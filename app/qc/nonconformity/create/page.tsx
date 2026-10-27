import { NonconformityCreatePage } from "@/features/qc/nonconformity-create-page";
import { getNonconformityReferenceData } from "@/services/qc/nonconformity.service";

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ testId?: string; batchId?: string }> }) {
  const [references, params] = await Promise.all([getNonconformityReferenceData(), searchParams]);
  return <NonconformityCreatePage references={references} initialTestId={params.testId} initialBatchId={params.batchId} />;
}

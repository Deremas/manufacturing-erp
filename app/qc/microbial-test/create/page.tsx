import { QcTaskTestCreatePage } from "@/features/qc/task-test-create-page";
export default async function Page({ searchParams }: { searchParams: Promise<{ batchId?: string; taskId?: string }> }) {
  const query = await searchParams;
  return <QcTaskTestCreatePage {...query} moduleLabel="Microbial Test" returnHref="/qc/microbial-test" />;
}

import { QcTasksLivePage } from "@/features/qc/live-pages";
import { listQcTasks } from "@/services/qc/qc-task.service";

export const dynamic = "force-dynamic";

export default async function ProductionOutputQcPage() {
  return (
    <QcTasksLivePage
      title="Production Output QC"
      subtitle="Inspect finished output from production stages. Tasks are created from QC master mappings — no stock is posted from this screen."
      rows={await listQcTasks()}
    />
  );
}

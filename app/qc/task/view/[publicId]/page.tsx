import { notFound } from "next/navigation";
import { QcTaskDetailPage } from "@/features/qc/task-detail-page";
import { getQcTaskById, listQcAssignableUsers } from "@/services/qc/qc-task.service";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const [task, users] = await Promise.all([getQcTaskById(publicId), listQcAssignableUsers()]);
  if (!task) notFound();
  return <QcTaskDetailPage task={task} users={users} />;
}

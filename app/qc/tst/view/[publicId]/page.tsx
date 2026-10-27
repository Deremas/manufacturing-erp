import { notFound } from "next/navigation";
import { QcTestDetailPage } from "@/features/qc/detail-pages";
import { getQcTestById } from "@/services/qc/qc.service";

export default async function Page({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const test = await getQcTestById(publicId);
  if (!test) notFound();
  return <QcTestDetailPage test={test} />;
}

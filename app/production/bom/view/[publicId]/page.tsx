import { notFound } from "next/navigation";
import { BomDetailPage } from "@/features/production/document-pages";
import { getBomById } from "@/services/production/bom.service";

export default async function ProductionBomViewPage({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  const bom = await getBomById(publicId);
  if (!bom) notFound();
  return <BomDetailPage bom={bom} />;
}

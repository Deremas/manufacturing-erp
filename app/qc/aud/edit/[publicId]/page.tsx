import { AuditForm } from "@/features/qc/quality-system-server";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: Promise<{ publicId: string }> }) {
  const { publicId } = await params;
  return <AuditForm id={publicId} mode="edit" />;
}

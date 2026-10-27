import { OperationalFormScreen } from "@/features/qc/operational-server";
import { notFound } from "next/navigation";
import { requireAuth } from "@/lib/auth/auth";
import { getQcTestRecord } from "@/services/qc/qc-record.service";

export const dynamic = "force-dynamic";

export default async function QcRecordEditPage({ params }: { params: Promise<{ publicId: string }> }) {
  const user = await requireAuth();
  const { publicId } = await params;
  const record = await getQcTestRecord(publicId, {
    accessibleLocationIds: user?.accessibleLocationIds,
    permissions: user?.permissions,
  });
  if (!record) notFound();
  return <OperationalFormScreen slug={String(record.slug)} id={publicId} mode="edit" />;
}

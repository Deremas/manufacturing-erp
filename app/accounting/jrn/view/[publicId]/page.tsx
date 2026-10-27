import { JournalDetailPage } from "@/features/accounting/JournalDetailPage";
import { requireAuth } from "@/lib/auth/auth";
import { getJournalEntryById } from "@/services/accounting/accounting.service";

export const dynamic = "force-dynamic";

export default async function JournalViewPage({ params }: { params: Promise<{ publicId: string }> }) {
  await requireAuth();
  const { publicId } = await params;
  const journal = await getJournalEntryById(publicId);
  return <JournalDetailPage journal={journal} />;
}

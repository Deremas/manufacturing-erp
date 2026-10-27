import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { SalesCreditNoteDetailPage } from "@/features/sales/CreditNotePages";
import { getSalesCreditNoteById } from "@/services/sales/credit-note.service";

export default async function SalesCreditNoteDetailRoute({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;
  const [item, preferences] = await Promise.all([
    getSalesCreditNoteById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  return <SalesCreditNoteDetailPage item={item} currencyCode={preferences.currencyCode} />;
}

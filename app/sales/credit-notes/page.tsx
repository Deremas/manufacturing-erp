import { requireAuth } from "@/lib/auth/auth";
import { getSystemPreferences } from "@/lib/server/system-preferences";
import { SalesCreditNoteListPage } from "@/features/sales/CreditNotePages";
import { listSalesCreditNotes } from "@/services/sales/credit-note.service";

export default async function SalesCreditNotesPage() {
  const user = await requireAuth();
  const [items, preferences] = await Promise.all([
    listSalesCreditNotes({ accessibleLocationIds: user.accessibleLocationIds }),
    getSystemPreferences(),
  ]);

  return <SalesCreditNoteListPage items={items} currencyCode={preferences.currencyCode} />;
}

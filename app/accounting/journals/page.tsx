import { JournalEntriesLivePage } from "@/features/accounting/accounting-pages";
import { listJournalEntries } from "@/services/accounting/accounting.service";

export default async function JournalEntriesPage() {
  const rows = await listJournalEntries();
  return <JournalEntriesLivePage rows={rows} />;
}

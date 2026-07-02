import { GeneralLedgerLivePage } from "@/features/accounting/accounting-pages";
import { getGeneralLedgerRows } from "@/services/accounting/accounting.service";

export default async function GeneralLedgerPage() {
  const rows = await getGeneralLedgerRows();
  return <GeneralLedgerLivePage rows={rows} />;
}

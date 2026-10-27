import { GeneralLedgerLivePage } from "@/features/accounting/accounting-pages";
import { getGeneralLedgerRows } from "@/services/accounting/accounting.service";

export const dynamic = "force-dynamic";

export default async function GeneralLedgerPage({ searchParams }: { searchParams?: Promise<{ account?: string }> }) {
  const params = searchParams ? await searchParams : {};
  const rows = await getGeneralLedgerRows();
  return <GeneralLedgerLivePage rows={rows} initialSearch={params.account ?? ""} />;
}

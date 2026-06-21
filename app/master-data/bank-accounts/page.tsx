import { BankAccountsListPage } from "@/features/master-data/bank-accounts";
import { getBankAccounts } from "@/lib/master-data-db";

export default async function MasterDataBankAccountsPage() {
  const bankAccounts = await getBankAccounts();
  return <BankAccountsListPage initialData={bankAccounts} />;
}

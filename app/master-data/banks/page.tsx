import { BanksListPage } from "@/features/master-data/banks";
import { getBanks } from "@/lib/master-data-db";

export default async function MasterDataBanksPage() {
  const banks = await getBanks();
  return <BanksListPage initialData={banks} />;
}

import { TaxCodesListPage } from "@/features/master-data/tax-codes";
import { getTaxCodes } from "@/lib/master-data-db";

export default async function MasterDataTaxCodesPage() {
  const taxCodes = await getTaxCodes();
  return <TaxCodesListPage initialData={taxCodes} />;
}

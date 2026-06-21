import { UnitsListPage } from "@/features/master-data/units";
import { getUnits } from "@/lib/master-data-db";

export default async function MasterDataUnitsPage() {
  const units = await getUnits();
  return <UnitsListPage initialData={units} />;
}

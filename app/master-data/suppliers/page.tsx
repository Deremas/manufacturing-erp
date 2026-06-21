import { SuppliersListPage } from "@/features/master-data/suppliers";
import { getSuppliers } from "@/lib/master-data-db";

export default async function MasterDataSuppliersPage() {
  const suppliers = await getSuppliers();
  return <SuppliersListPage initialData={suppliers} />;
}

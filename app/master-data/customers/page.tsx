import { CustomersListPage } from "@/features/master-data/customers";
import { getCustomers } from "@/lib/master-data-db";

export default async function MasterDataCustomersPage() {
  const customers = await getCustomers();
  return <CustomersListPage initialData={customers} />;
}

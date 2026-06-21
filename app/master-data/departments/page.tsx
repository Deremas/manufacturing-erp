import { DepartmentsListPage } from "@/features/master-data/departments";
import { getDepartments } from "@/lib/master-data-db";

export default async function MasterDataDepartmentsPage() {
  const departments = await getDepartments();
  return <DepartmentsListPage initialData={departments} />;
}

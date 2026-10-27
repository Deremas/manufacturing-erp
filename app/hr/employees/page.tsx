import EmployeesListPage from "@/features/hr/EmployeesListPage";
import { requireAuth } from "@/lib/auth/auth";
import { listEmployees } from "@/services/hr/hr.service";

export default async function HrEmployeesRoute() {
  await requireAuth();
  const employees = await listEmployees();
  return <EmployeesListPage initialData={employees} />;
}

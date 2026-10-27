import EmployeeFormPage from "@/features/hr/EmployeeFormPage";
import { requireAuth } from "@/lib/auth/auth";
import { getEmployeeFormOptions } from "@/services/hr/hr.service";

export default async function HrEmployeeCreateRoute() {
  await requireAuth();
  const options = await getEmployeeFormOptions();

  return (
    <EmployeeFormPage
      departments={options.departments}
      locations={options.locations}
      banks={options.banks}
      users={options.users}
      shiftDefinitions={options.shiftDefinitions}
      nextEmployeeNo={options.nextEmployeeNo}
      submitEndpoint="/api/hr/employees"
      successHref="/hr/employees"
    />
  );
}

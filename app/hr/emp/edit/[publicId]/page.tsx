import { notFound } from "next/navigation";

import EmployeeFormPage from "@/features/hr/EmployeeFormPage";
import { requireAuth } from "@/lib/auth/auth";
import { publicViewUrl } from "@/lib/routing/urls";
import { getEmployeeById, getEmployeeFormOptions } from "@/services/hr/hr.service";

export default async function HrEmployeeEditPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  await requireAuth();
  const { publicId } = await params;
  const [employee, options] = await Promise.all([
    getEmployeeById(publicId),
    getEmployeeFormOptions(),
  ]);
  if (!employee) notFound();

  return (
    <EmployeeFormPage
      initialData={employee}
      departments={options.departments}
      locations={options.locations}
      banks={options.banks}
      users={options.users}
      shiftDefinitions={options.shiftDefinitions}
      submitEndpoint={`/api/hr/employees/${employee.id}`}
      successHref={publicViewUrl("hr.employee", employee.publicId)}
      isEdit
    />
  );
}

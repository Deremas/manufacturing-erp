import { notFound } from "next/navigation";

import EmployeeDetailPage from "@/features/hr/EmployeeDetailPage";
import { requireAuth } from "@/lib/auth/auth";
import { getEmployeeById } from "@/services/hr/hr.service";
import { listEmployeePayrollAssignments } from "@/services/hr/payroll-assignment.service";

export default async function HrEmployeeViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;
  const employee = await getEmployeeById(publicId);
  if (!employee) notFound();

  const payrollAssignments = await listEmployeePayrollAssignments({
    accessibleLocationIds: user.accessibleLocationIds,
    employeeId: employee.id,
  });

  return <EmployeeDetailPage employee={employee} payrollAssignments={payrollAssignments} />;
}

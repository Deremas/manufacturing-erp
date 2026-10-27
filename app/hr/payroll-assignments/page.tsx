import { requireAuth } from "@/lib/auth/auth";
import PayrollAssignmentsPage from "@/features/hr/PayrollAssignmentsPage";
import { getEmployeePayrollAssignmentSummary, getPayrollAssignmentReferenceData, listEmployeePayrollAssignments } from "@/services/hr/payroll-assignment.service";

export default async function HrPayrollAssignmentsRoute({
  searchParams,
}: {
  searchParams?: Promise<{ employeeId?: string }>;
}) {
  const user = await requireAuth();
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const selectedEmployeeId = resolvedSearchParams?.employeeId?.trim() || undefined;
  const [initialItems, referenceData] = await Promise.all([
    listEmployeePayrollAssignments({
      accessibleLocationIds: user.accessibleLocationIds,
      employeeId: selectedEmployeeId,
    }),
    getPayrollAssignmentReferenceData({
      accessibleLocationIds: user.accessibleLocationIds,
    }),
  ]);
  const summary = selectedEmployeeId ? await getEmployeePayrollAssignmentSummary(selectedEmployeeId, {
    accessibleLocationIds: user.accessibleLocationIds,
  }) : null;

  return <PayrollAssignmentsPage initialItems={initialItems} selectedEmployeeId={selectedEmployeeId} summary={summary} {...referenceData} />;
}

import { notFound } from "next/navigation";

import PayrollRunDetailPage from "@/features/hr/PayrollRunDetailPage";
import { requireAuth } from "@/lib/auth/auth";
import { getPayrollRunById, listPayrollPaymentBankAccounts } from "@/services/hr/payroll.service";

export default async function HrPayrollViewPage({
  params,
}: {
  params: Promise<{ publicId: string }>;
}) {
  const user = await requireAuth();
  const { publicId } = await params;
  const [payroll, bankAccounts] = await Promise.all([
    getPayrollRunById(publicId, { accessibleLocationIds: user.accessibleLocationIds }),
    listPayrollPaymentBankAccounts({ accessibleLocationIds: user.accessibleLocationIds }),
  ]);
  if (!payroll) notFound();

  return (
    <PayrollRunDetailPage
      payroll={payroll}
      employees={payroll.employees}
      bankAccounts={bankAccounts}
    />
  );
}

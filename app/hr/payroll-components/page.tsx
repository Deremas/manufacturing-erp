import PayrollComponentsPage from "@/features/hr/PayrollComponentsPage";
import { listPayrollComponents } from "@/services/hr/payroll-component.service";

export default async function HrPayrollComponentsRoute() {
  const initialItems = await listPayrollComponents();
  return <PayrollComponentsPage initialItems={initialItems} />;
}

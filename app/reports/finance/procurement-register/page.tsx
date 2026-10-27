import { ProcurementFinanceRegisterPage } from "@/features/procurement/finance-report-pages";
import { getProcurementFinanceRegister } from "@/services/procurement/accounts-payable-report.service";

export default async function ProcurementFinanceRegisterRoute() {
  const rows = await getProcurementFinanceRegister();
  return <ProcurementFinanceRegisterPage rows={rows} />;
}

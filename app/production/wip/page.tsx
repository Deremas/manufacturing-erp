import { WipBalancePage } from "@/features/production/factory/FactoryReferencePages";
import { listFactoryWipBalances } from "@/services/production/factory-stock.service";

export const dynamic = "force-dynamic";

export default async function FactoryWipPage() {
  const rows = await listFactoryWipBalances();
  return <WipBalancePage rows={rows} />;
}

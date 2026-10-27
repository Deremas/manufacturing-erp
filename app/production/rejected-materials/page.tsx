import { RejectedMaterialsPage } from "@/features/production/factory/FactoryReferencePages";
import { listRejectedProductionOutput } from "@/services/production/factory-stock.service";

export const dynamic = "force-dynamic";

export default async function RejectedMaterialsRoute() {
  const rows = await listRejectedProductionOutput();
  return <RejectedMaterialsPage rows={rows} />;
}

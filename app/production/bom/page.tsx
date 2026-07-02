import { BomListPage } from "@/features/production/live-pages";
import { listBoms } from "@/services/production/bom.service";

export default async function BillOfMaterialsPage() {
  const rows = await listBoms();
  return <BomListPage rows={rows} />;
}

import LowStockPage from "@/features/inventory/low-stock/LowStockPage";
import { listLowStockRows } from "@/services/inventory/stock-balance.service";

export default async function LowStockRoute() {
  const rows = await listLowStockRows();

  return <LowStockPage initialData={rows} />;
}

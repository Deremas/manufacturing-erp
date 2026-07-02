import { listLowStockRows } from "./stock-balance.service";

export async function getLowStockItems() {
  return listLowStockRows();
}

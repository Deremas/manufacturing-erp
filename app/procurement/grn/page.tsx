import { GoodsReceiptListPage } from "@/features/procurement/grn/grn-pages";
import { listGoodsReceipts } from "@/services/procurement/grn.service";

export default async function GoodsReceiptsPage() {
  const receipts = await listGoodsReceipts();

  return (
    <GoodsReceiptListPage
      rows={receipts.map((receipt) => ({
        id: receipt.id,
        number: receipt.grnNo,
        date: receipt.grnDate,
        status: receipt.status,
        poNo: receipt.poNo ?? "-",
        supplierName: receipt.supplierName,
        locationName: receipt.locationName,
        itemCount: receipt.itemCount,
        totalAmount: receipt.totalAmount,
      }))}
    />
  );
}

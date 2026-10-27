import TransfersListPage from "@/features/inventory/transfers/TransfersListPage";
import { listTransfers } from "@/services/inventory/inventory-documents.service";

export default async function TransfersRoute() {
  const transfers = await listTransfers();

  return (
    <TransfersListPage
      rows={transfers.map((transfer) => ({
        id: transfer.id,
        publicId: transfer.publicId,
        number: transfer.transferNo,
        date: transfer.transferDate,
        status: transfer.status,
        itemCount: transfer.itemCount,
        primaryText: transfer.fromLocationName,
        secondaryText: transfer.toLocationName,
        ownerText: transfer.createdByName,
      }))}
    />
  );
}

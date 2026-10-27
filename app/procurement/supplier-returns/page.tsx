import { ProcurementListPage } from "@/features/procurement/document-pages";
import { listSupplierReturns } from "@/services/procurement/supplier-return.service";

export default async function SupplierReturnsPage() {
  const returns = await listSupplierReturns();

  return (
    <ProcurementListPage
      title="Supplier Returns"
      subtitle="Manage posted and pending returns back to suppliers from received stock."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Supplier Returns" },
      ]}
      createHref="/procurement/supplier-returns/create"
      baseHref="/procurement/supplier-returns"
      apiBasePath="/api/procurement/supplier-returns"
      kind="return"
      primaryLabel="Supplier"
      secondaryLabel="Return Location"
      ownerLabel="GRN Reference"
      rows={returns.map((row) => ({
        id: row.id,
        publicId: row.publicId,
        number: row.returnNo,
        date: row.returnDate,
        status: row.status,
        primary: row.supplierName,
        secondary: row.returnLocationName,
        owner: row.grnNo ?? "-",
        itemCount: row.itemCount,
        amount: row.totalAmount,
      }))}
    />
  );
}

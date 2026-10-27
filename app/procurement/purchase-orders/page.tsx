import { PurchaseOrderListPage } from "@/features/procurement/purchase-order-pages";
import { getProcurementReferenceData } from "@/app/procurement/_lib/reference-data";
import { listPurchaseOrders } from "@/services/procurement/purchase-order.service";

export default async function PurchaseOrdersPage() {
  const [orders, referenceData] = await Promise.all([
    listPurchaseOrders(),
    getProcurementReferenceData(),
  ]);

  return (
    <PurchaseOrderListPage
      title="Purchase Orders"
      subtitle="Manage supplier-facing orders, sourced from approved requisitions or created directly from live master data."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Purchase Orders" },
      ]}
      createHref="/procurement/purchase-orders/create"
      suppliers={referenceData.suppliers}
      rows={orders.map((row) => ({
        id: row.id,
        publicId: row.publicId,
        number: row.poNo,
        date: row.poDate,
        status: row.status,
        supplierId: row.supplierId,
        primary: row.supplierName,
        secondary: row.deliveryLocationName,
        owner: row.requisitionNo ?? "-",
        itemCount: row.itemCount,
        subtotal: row.subtotal,
        taxAmount: row.taxAmount,
        amount: row.totalAmount,
      }))}
    />
  );
}

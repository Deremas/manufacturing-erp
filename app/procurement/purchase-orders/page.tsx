import { ProcurementListPage } from "@/features/procurement/document-pages";
import { listPurchaseOrders } from "@/services/procurement/purchase-order.service";

export default async function PurchaseOrdersPage() {
  const orders = await listPurchaseOrders();

  return (
    <ProcurementListPage
      title="Purchase Orders"
      subtitle="Manage supplier-facing orders, sourced from approved requisitions or created directly from live master data."
      breadcrumbs={[
        { label: "Procurement", href: "/procurement" },
        { label: "Purchase Orders" },
      ]}
      createHref="/procurement/purchase-orders/create"
      baseHref="/procurement/purchase-orders"
      primaryLabel="Supplier"
      secondaryLabel="Delivery Location"
      ownerLabel="PR Reference"
      rows={orders.map((row) => ({
        id: row.id,
        number: row.poNo,
        date: row.poDate,
        status: row.status,
        primary: row.supplierName,
        secondary: row.deliveryLocationName,
        owner: row.requisitionNo ?? "-",
        itemCount: row.itemCount,
        amount: row.totalAmount,
      }))}
    />
  );
}

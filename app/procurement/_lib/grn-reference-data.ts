import { getCurrentUser } from "@/lib/auth/auth";
import { getUsers } from "@/lib/administration-db";
import { getSuppliers, getLocations } from "@/lib/master-data-db";
import { getGoodsReceiptPrefillFromPurchaseOrder } from "@/services/procurement/grn.service";
import { getPurchaseOrderById } from "@/services/procurement/purchase-order.service";
import { listPurchaseOrders } from "@/services/procurement/purchase-order.service";

export async function getGrnReferenceData(poPublicId?: string) {
  const linkedOrder = poPublicId ? await getPurchaseOrderById(poPublicId) : null;
  const poId = linkedOrder?.id;

  const [suppliers, locations, users, purchaseOrders, currentUser, prefill] = await Promise.all([
    getSuppliers(),
    getLocations(),
    getUsers(),
    listPurchaseOrders(),
    getCurrentUser(),
    poId ? getGoodsReceiptPrefillFromPurchaseOrder(poId) : Promise.resolve(null),
  ]);

  return {
    currentUser,
    prefill,
    suppliers: suppliers.map((supplier) => ({
      value: supplier.id,
      label: `${supplier.supplierCode} - ${supplier.name}`,
    })),
    locations: locations.map((location) => ({
      value: location.id,
      label: location.locationName,
    })),
    users: users.map((user) => ({
      value: user.id,
      label: user.name,
    })),
    purchaseOrders: purchaseOrders
      .filter((order) => order.status === "APPROVED" || order.status === "PARTIALLY_RECEIVED")
      .map((order) => ({
        value: order.id,
        label: `${order.poNo} - ${order.supplierName}`,
      })),
  };
}

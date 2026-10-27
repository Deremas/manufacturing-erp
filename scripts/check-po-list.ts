import { listPurchaseOrders } from "@/services/procurement/purchase-order.service";
import { sql } from "@/lib/db";

async function main() {
  const all = await sql`
    SELECT "poNo", status, "supplierId", "createdAt"::text
    FROM "PurchaseOrder"
    ORDER BY "createdAt" DESC
  `;
  console.log("DB count:", all.length);
  console.log(all);

  const listed = await listPurchaseOrders();
  console.log("listPurchaseOrders count:", listed.length);
  console.log(listed.map((row) => ({ poNo: row.poNo, status: row.status })));
}

main()
  .catch(console.error)
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });

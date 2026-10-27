import { sql } from "@/lib/db";
import {
  createPostedSale,
  createPostedSalesReturn,
  getSaleById,
} from "@/services/sales/sales.service";
import {
  archiveSalesArtifacts,
  closeTestDatabase,
  createSalesTestContext,
} from "@/tests/sales/_helpers";

async function main() {
  const context = await createSalesTestContext();

  try {
    const sale = await createPostedSale(
      {
        saleDate: new Date().toISOString(),
        locationId: context.factoryLocationId,
        paymentMethod: "CASH",
        lines: [{ itemId: context.fgItemId, quantity: 2 }],
      },
      {
        userId: context.userId,
        userName: context.userName,
      },
    );

    const detail = await getSaleById(sale.id);
    const line = detail?.items[0];
    if (!line) {
      throw new Error("Sale line missing");
    }

    const returned = await createPostedSalesReturn(
      {
        saleId: sale.id,
        returnDate: new Date().toISOString(),
        locationId: context.factoryLocationId,
        reason: "Smoke return",
        lines: [
          {
            saleItemId: line.id,
            itemId: context.fgItemId,
            unitId: line.unitId,
            quantity: 1,
            unitPrice: line.unitPrice,
            reason: "Smoke line",
          },
        ],
      },
      {
        userId: context.userId,
        userName: context.userName,
      },
    );

    const financeRows = await sql<
      Array<{ amount: number; status: string; postingType: string }>
    >`
      SELECT amount, status, "postingType"
      FROM "SalesFinancePosting"
      WHERE "sourceType" = 'sales.return'
        AND "sourceId" = ${returned.id}
      LIMIT 1
    `;

    const journalRows = await sql<
      Array<{ totalDebit: number; totalCredit: number }>
    >`
      SELECT "totalDebit", "totalCredit"
      FROM "JournalEntry"
      WHERE "sourceType" = 'sales.return'
        AND "sourceId" = ${returned.id}
      LIMIT 1
    `;

    const balanceRows = await sql<Array<{ availableQuantity: number }>>`
      SELECT "availableQuantity"
      FROM "StockBalance"
      WHERE "itemId" = ${context.fgItemId}
        AND "locationId" = ${context.factoryLocationId}
      LIMIT 1
    `;

    console.log(
      JSON.stringify(
        {
          saleId: sale.id,
          returnId: returned.id,
          finance: financeRows[0],
          journal: journalRows[0],
          balance: balanceRows[0],
        },
        null,
        2,
      ),
    );
  } finally {
    await archiveSalesArtifacts(context);
    await closeTestDatabase();
  }

  process.exit(0);
}

main().catch(async (error) => {
  console.error(error);
  try {
    await closeTestDatabase();
  } catch {}
  process.exit(1);
});

import ReceiveMaterialsPage from "@/features/production/shift-sessions/ReceiveMaterialsPage";
import { sql } from "@/lib/db";
import { listIssuedMaterialsAwaitingReceipt } from "@/services/shift/issued-materials";
import { loadShift, shiftPublicPath } from "@/app/production/shift-sessions/[id]/_lib/load-session";

export const dynamic = "force-dynamic";

type ReceiptLine = {
  issueNo: string;
  status: string;
  stockIssueNo: string | null;
  stockIssuePublicId: number | null;
  itemCode: string | null;
  itemName: string | null;
  uom: string | null;
  quantity: number | null;
};

export default async function ReceiveMaterialsRoute({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await loadShift(id, "/materials/receive");
  const [issued, receiptRows] = await Promise.all([
    listIssuedMaterialsAwaitingReceipt({
      factoryLocationId: session.locationId,
      sessionNo: session.sessionNo,
    }),
    sql<ReceiptLine[]>`
      SELECT
        pmi."issueNo",
        pmi.status::text AS status,
        si."issueNo" AS "stockIssueNo",
        si."publicId" AS "stockIssuePublicId",
        i."itemCode",
        i."itemName",
        COALESCE(NULLIF(TRIM(uom.abbreviation), ''), NULLIF(TRIM(uom.name), ''), '') AS uom,
        pmii."issuedQty" AS quantity
      FROM "ProductionMaterialIssue" pmi
      LEFT JOIN "StockIssue" si ON pmi.remarks = ('inventory-issue:' || si.id)
      LEFT JOIN "ProductionMaterialIssueItem" pmii ON pmii."issueId" = pmi.id
      LEFT JOIN "Item" i ON i.id = pmii."itemId"
      LEFT JOIN "Unit" uom ON uom.id = COALESCE(pmii."uomId", i."uomId")
      WHERE pmi."shiftSessionId" = ${session.id}
      ORDER BY pmi."createdAt" DESC, i."itemCode" ASC
    `,
  ]);

  const receipts = new Map<string, {
    issueNo: string;
    status: string;
    stockIssueNo: string | null;
    stockIssuePublicId: number | null;
    items: Array<{ itemCode: string; itemName: string; uom: string; quantity: number }>;
  }>();
  for (const row of receiptRows) {
    const current = receipts.get(row.issueNo) ?? {
      issueNo: row.issueNo,
      status: row.status,
      stockIssueNo: row.stockIssueNo,
      stockIssuePublicId: row.stockIssuePublicId == null ? null : Number(row.stockIssuePublicId),
      items: [],
    };
    if (row.itemCode && row.itemName) {
      current.items.push({
        itemCode: row.itemCode,
        itemName: row.itemName,
        uom: row.uom ?? "",
        quantity: Number(row.quantity ?? 0),
      });
    }
    receipts.set(row.issueNo, current);
  }

  return (
    <ReceiveMaterialsPage
      sessionNo={session.sessionNo}
      sessionPath={shiftPublicPath(session.publicId)}
      productionDate={session.productionDate}
      shiftCode={session.shiftCode}
      factoryLocationName={session.locationName}
      shiftStatus={session.status}
      issueApiPath={`/api/shifts/sessions/${session.id}/materials/issue`}
      issued={issued}
      receipts={[...receipts.values()]}
    />
  );
}

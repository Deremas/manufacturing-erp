import { sql } from "@/lib/db";

const INVENTORY_ISSUE_REMARK = "inventory-issue:";

export interface IssuedMaterialLine {
  itemCode: string;
  itemName: string;
  uom: string;
  quantity: number;
}

export interface IssuedMaterialDocument {
  id: string;
  publicId: number;
  issueNo: string;
  issueDate: string;
  fromLocationName: string;
  issuedToName: string;
  purpose: string;
  items: IssuedMaterialLine[];
}

type IssuedLineRow = {
  id: string;
  publicId: number;
  issueNo: string;
  issueDate: string;
  fromLocationName: string;
  issuedToName: string;
  purpose: string;
  itemCode: string;
  itemName: string;
  uom: string;
  quantity: number;
};

function groupIssuedLines(rows: IssuedLineRow[]): IssuedMaterialDocument[] {
  const documents = new Map<string, IssuedMaterialDocument>();
  for (const row of rows) {
    const quantity = Number(row.quantity ?? 0);
    if (quantity <= 0) continue;
    const current = documents.get(row.id) ?? {
      id: row.id,
      publicId: Number(row.publicId),
      issueNo: row.issueNo,
      issueDate: row.issueDate,
      fromLocationName: row.fromLocationName,
      issuedToName: row.issuedToName,
      purpose: row.purpose ?? "",
      items: [],
    };
    current.items.push({
      itemCode: row.itemCode,
      itemName: row.itemName,
      uom: row.uom ?? "",
      quantity,
    });
    documents.set(row.id, current);
  }
  return [...documents.values()];
}

export async function listIssuedMaterialsAwaitingReceipt(input: {
  factoryLocationId: string;
  sessionNo: string;
}) {
  const sessionLike = `%${input.sessionNo.replace(/[%_\\]/g, "")}%`;
  const rows = await sql<IssuedLineRow[]>`
    SELECT
      si.id,
      si."publicId",
      si."issueNo",
      si."issueDate"::text AS "issueDate",
      l."locationName" AS "fromLocationName",
      COALESCE(d.name, dest."locationName", u2.name, si."issuedToId") AS "issuedToName",
      COALESCE(si.purpose, '') AS purpose,
      i."itemCode",
      i."itemName",
      COALESCE(NULLIF(TRIM(uom.abbreviation), ''), NULLIF(TRIM(uom.name), ''), '') AS uom,
      GREATEST(sii.quantity - COALESCE(returned.quantity, 0), 0)::float AS quantity
    FROM "StockIssue" si
    INNER JOIN "Location" l ON l.id = si."locationId"
    INNER JOIN "StockIssueItem" sii ON sii."issueId" = si.id
    INNER JOIN "Item" i ON i.id = sii."itemId"
    LEFT JOIN "Unit" uom ON uom.id = i."uomId"
    LEFT JOIN "Department" d ON d.id = si."issuedToId"
    LEFT JOIN "Location" dest ON dest.id = si."issuedToId"
    LEFT JOIN "User" u2 ON u2.id = si."issuedToId"
    LEFT JOIN LATERAL (
      SELECT SUM(sri.quantity) AS quantity
      FROM "StockReturn" sr
      INNER JOIN "StockReturnItem" sri ON sri."returnId" = sr.id
      WHERE sr.reason = si.id
        AND sri."itemId" = sii."itemId"
        AND sr.status IN ('SUBMITTED', 'APPROVED', 'POSTED')
    ) returned ON true
    WHERE si.status = 'POSTED'
      AND NOT EXISTS (
        SELECT 1
        FROM "ProductionMaterialIssue" pmi
        WHERE pmi.remarks = (${INVENTORY_ISSUE_REMARK} || si.id)
      )
      AND (
        (LOWER(si."issuedToType") = 'location' AND si."issuedToId" = ${input.factoryLocationId})
        OR (
          LOWER(si."issuedToType") = 'department'
          AND EXISTS (
            SELECT 1
            FROM "Department" pd
            WHERE pd.id = si."issuedToId"
              AND pd.name ILIKE '%production%'
          )
        )
        OR si.purpose = ${input.sessionNo}
        OR COALESCE(si.remarks, '') ILIKE ${sessionLike}
      )
      AND GREATEST(sii.quantity - COALESCE(returned.quantity, 0), 0) > 0
    ORDER BY si."issueDate" DESC, si."issueNo" DESC, i."itemCode" ASC
  `;
  return groupIssuedLines(rows);
}

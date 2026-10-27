import { randomUUID } from "crypto";

import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { writeSalesAudit, writeSalesHistory } from "@/services/sales/sales-shared.service";

type Scope = {
  accessibleLocationIds?: string[] | null;
};

export interface OverdueCustomerRow {
  customerId: string;
  customerCode: string;
  customerName: string;
  locationId: string;
  locationCode: string;
  locationName: string;
  invoiceCount: number;
  overdueBalance: number;
  oldestDueDate?: string;
  oldestAgeDays: number;
  latestFollowUpStatus?: string;
  latestPromisedPaymentDate?: string;
  latestPromisedAmount?: number;
}

export interface CollectionFollowUpRow {
  id: string;
  publicId: number;
  customerId: string;
  customerCode: string;
  customerName: string;
  salesInvoiceId?: string;
  invoiceNo?: string;
  followUpDate: string;
  status: string;
  promisedPaymentDate?: string;
  promisedAmount?: number;
  assignedToId?: string;
  assignedToName?: string;
  notes?: string;
  createdAt: string;
}

export interface CollectionFollowUpInput {
  customerId: string;
  salesInvoiceId?: string | null;
  followUpDate: string;
  status: string;
  promisedPaymentDate?: string | null;
  promisedAmount?: number | null;
  assignedToId?: string | null;
  notes?: string | null;
}

function normalizeText(value: string | null | undefined) {
  const text = String(value ?? "").trim();
  return text.length > 0 ? text : null;
}

export async function listOverdueCustomers(scope: Scope = {}): Promise<OverdueCustomerRow[]> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return [];
  }

  const rows = await sql<Array<OverdueCustomerRow>>`
    WITH overdue_invoices AS (
      SELECT
        si.id,
        si."customerId",
        c."customerCode",
        c.name AS "customerName",
        si."locationId",
        l."locationCode",
        l."locationName",
        si."dueDate"::text AS "dueDate",
        si."balanceDue",
        GREATEST(
          FLOOR(EXTRACT(EPOCH FROM ((CURRENT_DATE)::timestamp - COALESCE(si."dueDate", si."invoiceDate"))) / 86400.0),
          0
        )::int AS "ageDays"
      FROM "SalesInvoice" si
      INNER JOIN "Customer" c ON c.id = si."customerId"
      INNER JOIN "Location" l ON l.id = si."locationId"
      WHERE si."isArchived" = false
        AND si.status = 'POSTED'
        AND COALESCE(si."balanceDue", 0) > 0
        AND COALESCE(si."dueDate", si."invoiceDate") < CURRENT_DATE
        AND (${locationIds.length > 0 ? locationIds : null}::text[] IS NULL OR si."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[]))
    ),
    latest_followups AS (
      SELECT DISTINCT ON (cf."customerId")
        cf."customerId",
        cf.status,
        cf."promisedPaymentDate"::text AS "promisedPaymentDate",
        cf."promisedAmount"
      FROM "CollectionFollowUp" cf
      WHERE cf."isArchived" = false
      ORDER BY cf."customerId", cf."followUpDate" DESC, cf."createdAt" DESC
    )
    SELECT
      oi."customerId",
      oi."customerCode",
      oi."customerName",
      oi."locationId",
      oi."locationCode",
      oi."locationName",
      COUNT(*)::int AS "invoiceCount",
      COALESCE(SUM(oi."balanceDue"), 0)::double precision AS "overdueBalance",
      MIN(oi."dueDate") AS "oldestDueDate",
      COALESCE(MAX(oi."ageDays"), 0)::int AS "oldestAgeDays",
      lf.status AS "latestFollowUpStatus",
      lf."promisedPaymentDate" AS "latestPromisedPaymentDate",
      lf."promisedAmount" AS "latestPromisedAmount"
    FROM overdue_invoices oi
    LEFT JOIN latest_followups lf ON lf."customerId" = oi."customerId"
    GROUP BY
      oi."customerId",
      oi."customerCode",
      oi."customerName",
      oi."locationId",
      oi."locationCode",
      oi."locationName",
      lf.status,
      lf."promisedPaymentDate",
      lf."promisedAmount"
    ORDER BY "overdueBalance" DESC, "oldestAgeDays" DESC, "customerName" ASC
  `;

  return rows.map((row) => ({
    ...row,
    invoiceCount: Number(row.invoiceCount ?? 0),
    overdueBalance: Number(row.overdueBalance ?? 0),
    oldestAgeDays: Number(row.oldestAgeDays ?? 0),
    latestPromisedAmount: row.latestPromisedAmount != null ? Number(row.latestPromisedAmount) : undefined,
  }));
}

export async function listCollectionFollowUps(scope: Scope = {}): Promise<CollectionFollowUpRow[]> {
  const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);
  if (scope.accessibleLocationIds && locationIds.length === 0) {
    return [];
  }

  const rows = await sql<Array<CollectionFollowUpRow>>`
    SELECT
      cf.id,
      cf."publicId",
      cf."customerId",
      c."customerCode",
      c.name AS "customerName",
      cf."salesInvoiceId",
      si."invoiceNo",
      cf."followUpDate"::text AS "followUpDate",
      cf.status,
      cf."promisedPaymentDate"::text AS "promisedPaymentDate",
      cf."promisedAmount",
      cf."assignedToId",
      u.name AS "assignedToName",
      cf.notes,
      cf."createdAt"::text AS "createdAt"
    FROM "CollectionFollowUp" cf
    INNER JOIN "Customer" c ON c.id = cf."customerId"
    LEFT JOIN "SalesInvoice" si ON si.id = cf."salesInvoiceId"
    LEFT JOIN "User" u ON u.id = cf."assignedToId"
    WHERE cf."isArchived" = false
      AND (
        ${locationIds.length > 0 ? locationIds : null}::text[] IS NULL
        OR EXISTS (
          SELECT 1
          FROM "SalesInvoice" vsi
          WHERE vsi.id = cf."salesInvoiceId"
            AND vsi."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[])
        )
        OR EXISTS (
          SELECT 1
          FROM "SalesInvoice" csi
          WHERE csi."customerId" = cf."customerId"
            AND csi."locationId" = ANY(${locationIds.length > 0 ? locationIds : null}::text[])
        )
      )
    ORDER BY cf."followUpDate" DESC, cf."createdAt" DESC
  `;

  return rows.map((row) => ({
    ...row,
    promisedAmount: row.promisedAmount != null ? Number(row.promisedAmount) : undefined,
  }));
}

export async function createCollectionFollowUp(
  input: CollectionFollowUpInput,
  actor: { userId: string; userName: string },
  scope: Scope = {},
) {
  if (!input.customerId) {
    throw new Error("Customer is required");
  }
  if (!input.followUpDate) {
    throw new Error("Follow-up date is required");
  }
  if (!normalizeText(input.status)) {
    throw new Error("Follow-up status is required");
  }

  return sql.begin(async (tx) => {
    const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);

    const customerRows = await tx<Array<{ id: string; customerCode: string; name: string }>>`
      SELECT id, "customerCode", name
      FROM "Customer"
      WHERE id = ${input.customerId}
        AND "isArchived" = false
        AND "isActive" = true
      LIMIT 1
    `;
    const customer = customerRows[0];
    if (!customer) {
      throw new Error("Customer was not found");
    }

    if (input.salesInvoiceId) {
      const invoiceRows = await tx<Array<{ id: string; invoiceNo: string; customerId: string | null; locationId: string }>>`
        SELECT id, "invoiceNo", "customerId", "locationId"
        FROM "SalesInvoice"
        WHERE id = ${input.salesInvoiceId}
          AND "isArchived" = false
        LIMIT 1
      `;
      const invoice = invoiceRows[0];
      if (!invoice) {
        throw new Error("Sales invoice was not found");
      }
      if (invoice.customerId !== customer.id) {
        throw new Error("Selected invoice belongs to a different customer");
      }
      if (scope.accessibleLocationIds && locationIds.length > 0 && !locationIds.includes(invoice.locationId)) {
        throw new Error("Selected invoice is outside your accessible locations");
      }
    }

    const id = randomUUID();
    await tx`
      INSERT INTO "CollectionFollowUp" (
        id, "customerId", "salesInvoiceId", "followUpDate", status, "promisedPaymentDate",
        "promisedAmount", "assignedToId", "createdById", "updatedById", notes, "isArchived", "createdAt", "updatedAt"
      )
      VALUES (
        ${id},
        ${customer.id},
        ${normalizeText(input.salesInvoiceId)},
        ${input.followUpDate}::timestamptz,
        ${normalizeText(input.status)},
        ${normalizeText(input.promisedPaymentDate)}::timestamptz,
        ${input.promisedAmount != null ? Number(input.promisedAmount) : null},
        ${normalizeText(input.assignedToId)},
        ${actor.userId},
        ${actor.userId},
        ${normalizeText(input.notes)},
        false,
        NOW(),
        NOW()
      )
    `;

    await writeSalesAudit(tx, actor.userId, "sales.collections", "CREATE_FOLLOW_UP", id, {
      customerId: customer.id,
      salesInvoiceId: normalizeText(input.salesInvoiceId),
      followUpDate: input.followUpDate,
      status: normalizeText(input.status),
      promisedPaymentDate: normalizeText(input.promisedPaymentDate),
      promisedAmount: input.promisedAmount != null ? Number(input.promisedAmount) : null,
    });
    await writeSalesHistory(tx, "sales.collections", id, "CREATED", actor.userId, `Collection follow-up logged for ${customer.customerCode} - ${customer.name}`);

    return { id };
  });
}

export async function updateCollectionFollowUp(
  id: string,
  input: CollectionFollowUpInput,
  actor: { userId: string; userName: string },
  scope: Scope = {},
) {
  if (!input.customerId) {
    throw new Error("Customer is required");
  }
  if (!input.followUpDate) {
    throw new Error("Follow-up date is required");
  }
  if (!normalizeText(input.status)) {
    throw new Error("Follow-up status is required");
  }

  return sql.begin(async (tx) => {
    const locationIds = (scope.accessibleLocationIds ?? []).filter(Boolean);

    const existingRows = await tx<Array<{
      id: string;
      customerId: string;
      salesInvoiceId: string | null;
      status: string;
    }>>`
      SELECT id, "customerId", "salesInvoiceId", status
      FROM "CollectionFollowUp"
      WHERE id = ${id}
        AND "isArchived" = false
      LIMIT 1
      FOR UPDATE
    `;
    const existing = existingRows[0];
    if (!existing) {
      throw new Error("Collection follow-up was not found");
    }

    const customerRows = await tx<Array<{ id: string; customerCode: string; name: string }>>`
      SELECT id, "customerCode", name
      FROM "Customer"
      WHERE id = ${input.customerId}
        AND "isArchived" = false
        AND "isActive" = true
      LIMIT 1
    `;
    const customer = customerRows[0];
    if (!customer) {
      throw new Error("Customer was not found");
    }

    if (input.salesInvoiceId) {
      const invoiceRows = await tx<Array<{ id: string; customerId: string | null; locationId: string }>>`
        SELECT id, "customerId", "locationId"
        FROM "SalesInvoice"
        WHERE id = ${input.salesInvoiceId}
          AND "isArchived" = false
        LIMIT 1
      `;
      const invoice = invoiceRows[0];
      if (!invoice) {
        throw new Error("Sales invoice was not found");
      }
      if (invoice.customerId !== customer.id) {
        throw new Error("Selected invoice belongs to a different customer");
      }
      if (scope.accessibleLocationIds && locationIds.length > 0 && !locationIds.includes(invoice.locationId)) {
        throw new Error("Selected invoice is outside your accessible locations");
      }
    }

    await tx`
      UPDATE "CollectionFollowUp"
      SET
        "customerId" = ${customer.id},
        "salesInvoiceId" = ${normalizeText(input.salesInvoiceId)},
        "followUpDate" = ${input.followUpDate}::timestamptz,
        status = ${normalizeText(input.status)},
        "promisedPaymentDate" = ${normalizeText(input.promisedPaymentDate)}::timestamptz,
        "promisedAmount" = ${input.promisedAmount != null ? Number(input.promisedAmount) : null},
        "assignedToId" = ${normalizeText(input.assignedToId)},
        notes = ${normalizeText(input.notes)},
        "updatedById" = ${actor.userId},
        "updatedAt" = NOW()
      WHERE id = ${id}
    `;

    await writeSalesAudit(
      tx,
      actor.userId,
      "sales.collections",
      "UPDATE_FOLLOW_UP",
      id,
      {
        customerId: customer.id,
        salesInvoiceId: normalizeText(input.salesInvoiceId),
        followUpDate: input.followUpDate,
        status: normalizeText(input.status),
        promisedPaymentDate: normalizeText(input.promisedPaymentDate),
        promisedAmount: input.promisedAmount != null ? Number(input.promisedAmount) : null,
        assignedToId: normalizeText(input.assignedToId),
      },
      {
        customerId: existing.customerId,
        salesInvoiceId: existing.salesInvoiceId,
        status: existing.status,
      },
    );
    await writeSalesHistory(
      tx,
      "sales.collections",
      id,
      "UPDATED",
      actor.userId,
      `Collection follow-up updated for ${customer.customerCode} - ${customer.name}`,
    );

    return { id };
  });
}


export async function getCollectionFollowUpById(id: string): Promise<CollectionFollowUpRow | null> {
  const rows = await sql<CollectionFollowUpRow[]>`
    SELECT
      cf.id,
      cf."publicId",
      cf."customerId",
      c."customerCode",
      c.name AS "customerName",
      cf."salesInvoiceId",
      si."invoiceNo",
      cf."followUpDate"::text AS "followUpDate",
      cf.status,
      cf."promisedPaymentDate"::text AS "promisedPaymentDate",
      cf."promisedAmount",
      cf."assignedToId",
      u.name AS "assignedToName",
      cf.notes,
      cf."createdAt"::text AS "createdAt"
    FROM "CollectionFollowUp" cf
    INNER JOIN "Customer" c ON c.id = cf."customerId"
    LEFT JOIN "SalesInvoice" si ON si.id = cf."salesInvoiceId"
    LEFT JOIN "User" u ON u.id = cf."assignedToId"
    WHERE ${isPublicIdParam(id) ? sql`cf."publicId" = ${Number(id)}` : sql`cf.id = ${id}`}
      AND cf."isArchived" = false
    LIMIT 1
  `;
  const row = rows[0];
  if (!row) return null;
  return {
    ...row,
    promisedAmount: row.promisedAmount != null ? Number(row.promisedAmount) : undefined,
  };
}

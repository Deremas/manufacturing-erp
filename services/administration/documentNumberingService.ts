import { formatDocumentNumber } from "@/lib/document-numbering";
import { sql } from "@/lib/db";
import { isPublicIdParam } from "@/lib/routing/public-id";
import { formatDocumentNumber } from "@/lib/document-numbering";
import { AuditAction, createAuditLog } from "@/services/audit/auditLog";
import type {
  CreateDocumentNumberingInput,
  DocumentNumberingConfig,
  PaginatedResult,
  QueryParams,
  ServiceResult,
  UpdateDocumentNumberingInput,
} from "@/types/administration";

type DocumentNumberingRow = {
  id: string;
  publicId: number;
  publicId: number;
  prefix: string;
  description: string | null;
  prefixFormat: string;
  separator: string;
  yearFormat: string;
  monthFormat: string;
  dayFormat: string;
  sequenceLength: number;
  currentSequence: number;
  isActive: boolean;
  isArchived: boolean;
};

const DESCRIPTION_SEPARATOR = " :: ";

function parseDescription(description: string | null, prefix: string) {
  const value = String(description ?? "").trim();
  if (!value) {
    return { module: "General", documentType: prefix };
  }

  const [module, ...rest] = value.split(DESCRIPTION_SEPARATOR);
  if (!rest.length) {
    return { module: "General", documentType: value };
  }

  return {
    module: module.trim() || "General",
    documentType: rest.join(DESCRIPTION_SEPARATOR).trim() || prefix,
  };
}

function composeDescription(module: string, documentType: string) {
  const normalizedModule = module.trim() || "General";
  const normalizedDocumentType = documentType.trim();
  return normalizedDocumentType
    ? `${normalizedModule}${DESCRIPTION_SEPARATOR}${normalizedDocumentType}`
    : normalizedModule;
}

function toPrefixFormat(resetRule?: string) {
  switch (String(resetRule ?? "Never").trim()) {
    case "Daily":
      return "PREFIX_YEAR_MONTH_DAY";
    case "Monthly":
      return "PREFIX_YEAR_MONTH";
    case "Yearly":
      return "PREFIX_YEAR";
    default:
      return "PREFIX";
  }
}

function toResetRule(prefixFormat: string) {
  switch (prefixFormat) {
    case "PREFIX_YEAR_MONTH_DAY":
      return "Daily";
    case "PREFIX_YEAR_MONTH":
      return "Monthly";
    case "PREFIX_YEAR":
      return "Yearly";
    default:
      return "Never";
  }
}

function buildPreview(row: DocumentNumberingRow) {
  const { module, documentType } = parseDescription(row.description, row.prefix);
  return {
    module,
    documentType,
    preview: formatDocumentNumber(
      {
        prefix: row.prefix,
        prefixFormat: row.prefixFormat,
        separator: row.separator,
        yearFormat: row.yearFormat,
        monthFormat: row.monthFormat,
        dayFormat: row.dayFormat,
        sequenceLength: row.sequenceLength,
      },
      Math.max(1, Number(row.currentSequence ?? 0) + 1),
    ),
  };
}

function mapRow(row: DocumentNumberingRow): DocumentNumberingConfig {
  return {
    id: row.id,
    publicId: row.publicId,
    publicId: row.publicId,
    prefix: row.prefix,
    description: row.description ?? undefined,
    prefixFormat: row.prefixFormat,
    separator: row.separator,
    yearFormat: row.yearFormat,
    monthFormat: row.monthFormat,
    dayFormat: row.dayFormat,
    sequenceLength: row.sequenceLength,
    currentSequence: row.currentSequence,
    isActive: row.isActive,
    isArchived: row.isArchived,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    example: buildPreview(row).preview,
  };
}

async function getRowById(id: string) {
  const rows = await sql<DocumentNumberingRow[]>`
    SELECT
      id,
      "publicId",
      prefix,
      description,
      "prefixFormat",
      separator,
      "yearFormat",
      "monthFormat",
      "dayFormat",
      "sequenceLength",
      "currentSequence",
      "isActive",
      "isArchived"
    FROM "DocumentNumbering"
    WHERE ${isPublicIdParam(id) ? sql`"publicId" = ${Number(id)}` : sql`id = ${id}`}
      AND "isArchived" = false
    LIMIT 1
  `;

  return rows[0] ?? null;
}

export async function getAll(
  params?: QueryParams,
): Promise<PaginatedResult<DocumentNumberingConfig>> {
  const search = params?.search?.trim().toLowerCase() ?? "";
  const rows = await sql<DocumentNumberingRow[]>`
    SELECT
      id,
      "publicId",
      prefix,
      description,
      "prefixFormat",
      separator,
      "yearFormat",
      "monthFormat",
      "dayFormat",
      "sequenceLength",
      "currentSequence",
      "isActive",
      "isArchived"
    FROM "DocumentNumbering"
    WHERE "isArchived" = ${params?.isArchived ?? false}
    ORDER BY prefix ASC
  `;

  const filtered = rows
    .map(mapRow)
    .filter((row) => {
      if (params?.isActive !== undefined && row.isActive !== params.isActive) {
        return false;
      }

      if (!search) {
        return true;
      }

      return [
        row.prefix,
        row.description,
        row.example,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(search));
    });

  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const start = (page - 1) * limit;
  const items = filtered.slice(start, start + limit);

  return {
    items,
    total: filtered.length,
    page,
    limit,
    totalPages: Math.max(1, Math.ceil(filtered.length / limit)),
  };
}

export async function getById(
  id: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  try {
    const row = await getRowById(id);
    if (!row) {
      return { success: false, error: "Document numbering configuration not found" };
    }

    return { success: true, data: mapRow(row) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load document numbering configuration",
    };
  }
}

export async function getByPrefix(
  prefix: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  try {
    const rows = await sql<DocumentNumberingRow[]>`
      SELECT
        id,
        prefix,
        description,
        "prefixFormat",
        separator,
        "yearFormat",
        "monthFormat",
        "dayFormat",
        "sequenceLength",
        "currentSequence",
        "isActive",
        "isArchived"
      FROM "DocumentNumbering"
      WHERE prefix = ${prefix}
        AND "isArchived" = false
      LIMIT 1
    `;

    if (!rows[0]) {
      return { success: false, error: "Document numbering configuration not found" };
    }

    return { success: true, data: mapRow(rows[0]) };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to load document numbering configuration",
    };
  }
}

export async function create(
  input: CreateDocumentNumberingInput & {
    module?: string;
    documentType?: string;
    resetRule?: string;
    includeYear?: boolean;
    includeMonth?: boolean;
    includeLocation?: boolean;
  },
  userId: string,
  userName: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  try {
    const prefix = String(input.prefix ?? "").trim().toUpperCase();
    if (!prefix) {
      return { success: false, error: "Prefix is required" };
    }

    const inserted = await sql<DocumentNumberingRow[]>`
      INSERT INTO "DocumentNumbering" (
        prefix,
        description,
        "prefixFormat",
        separator,
        "yearFormat",
        "monthFormat",
        "dayFormat",
        "sequenceLength",
        "currentSequence",
        "isActive",
        "isArchived"
      )
      VALUES (
        ${prefix},
        ${composeDescription(String(input.module ?? "General"), String(input.documentType ?? input.description ?? prefix))},
        ${toPrefixFormat(input.resetRule)},
        ${String(input.separator ?? "-")},
        ${input.includeYear ? "YYYY" : ""},
        ${input.includeMonth ? "MM" : ""},
        ${input.includeLocation ? "LOC" : ""},
        ${Number(input.sequenceLength ?? 4)},
        ${Number(input.currentSequence ?? 1)},
        true,
        false
      )
      RETURNING
        id,
        prefix,
        description,
        "prefixFormat",
        separator,
        "yearFormat",
        "monthFormat",
        "dayFormat",
        "sequenceLength",
        "currentSequence",
        "isActive",
        "isArchived"
    `;

    const created = mapRow(inserted[0]);

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.CREATE,
      module: "DOCUMENT_NUMBERING",
      recordId: created.id,
      newValue: created as unknown as Record<string, unknown>,
    });

    return {
      success: true,
      data: created,
      message: "Document numbering configuration created successfully",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to create document numbering configuration",
    };
  }
}

export async function update(
  id: string,
  input: UpdateDocumentNumberingInput & {
    module?: string;
    documentType?: string;
    resetRule?: string;
    includeYear?: boolean;
    includeMonth?: boolean;
    includeLocation?: boolean;
    isActive?: boolean;
  },
  userId: string,
  userName: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  try {
    const existing = await getRowById(id);
    if (!existing) {
      return { success: false, error: "Document numbering configuration not found" };
    }

    const existingPreview = buildPreview(existing);
    const updatedRows = await sql<DocumentNumberingRow[]>`
      UPDATE "DocumentNumbering"
      SET
        prefix = ${String(input.prefix ?? existing.prefix).trim().toUpperCase()},
        description = ${composeDescription(
          String(input.module ?? existingPreview.module),
          String(input.documentType ?? parseDescription(existing.description, existing.prefix).documentType),
        )},
        "prefixFormat" = ${toPrefixFormat(input.resetRule ?? toResetRule(existing.prefixFormat))},
        separator = ${String(input.separator ?? existing.separator)},
        "yearFormat" = ${input.includeYear ?? Boolean(existing.yearFormat) ? "YYYY" : ""},
        "monthFormat" = ${input.includeMonth ?? Boolean(existing.monthFormat) ? "MM" : ""},
        "dayFormat" = ${input.includeLocation ?? existing.dayFormat === "LOC" ? "LOC" : ""},
        "sequenceLength" = ${Number(input.sequenceLength ?? existing.sequenceLength)},
        "currentSequence" = ${Number(input.currentSequence ?? existing.currentSequence)},
        "isActive" = ${input.isActive ?? existing.isActive}
      WHERE id = ${id}
      RETURNING
        id,
        prefix,
        description,
        "prefixFormat",
        separator,
        "yearFormat",
        "monthFormat",
        "dayFormat",
        "sequenceLength",
        "currentSequence",
        "isActive",
        "isArchived"
    `;

    const updated = mapRow(updatedRows[0]);

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "DOCUMENT_NUMBERING",
      recordId: updated.id,
      oldValue: mapRow(existing) as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return {
      success: true,
      data: updated,
      message: "Document numbering configuration updated successfully",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to update document numbering configuration",
    };
  }
}

export async function deactivate(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  return update(id, { isActive: false }, userId, userName);
}

export async function archive(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  try {
    const existing = await getRowById(id);
    if (!existing) {
      return { success: false, error: "Document numbering configuration not found" };
    }

    const updatedRows = await sql<DocumentNumberingRow[]>`
      UPDATE "DocumentNumbering"
      SET
        "isActive" = false,
        "isArchived" = true
      WHERE id = ${id}
      RETURNING
        id,
        prefix,
        description,
        "prefixFormat",
        separator,
        "yearFormat",
        "monthFormat",
        "dayFormat",
        "sequenceLength",
        "currentSequence",
        "isActive",
        "isArchived"
    `;

    const updated = mapRow(updatedRows[0]);

    await createAuditLog({
      userId,
      userName,
      action: AuditAction.UPDATE,
      module: "DOCUMENT_NUMBERING",
      recordId: updated.id,
      oldValue: mapRow(existing) as unknown as Record<string, unknown>,
      newValue: updated as unknown as Record<string, unknown>,
    });

    return {
      success: true,
      data: updated,
      message: "Document numbering configuration archived successfully",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to archive document numbering configuration",
    };
  }
}

export async function restore(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  try {
    const rows = await sql<DocumentNumberingRow[]>`
      UPDATE "DocumentNumbering"
      SET
        "isActive" = true,
        "isArchived" = false
      WHERE id = ${id}
      RETURNING
        id,
        prefix,
        description,
        "prefixFormat",
        separator,
        "yearFormat",
        "monthFormat",
        "dayFormat",
        "sequenceLength",
        "currentSequence",
        "isActive",
        "isArchived"
    `;

    if (!rows[0]) {
      return { success: false, error: "Document numbering configuration not found" };
    }

    return {
      success: true,
      data: mapRow(rows[0]),
      message: "Document numbering configuration restored successfully",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to restore document numbering configuration",
    };
  }
}

export async function search(
  query: string,
): Promise<ServiceResult<DocumentNumberingConfig[]>> {
  const result = await getAll({ search: query, limit: 200 });
  return { success: true, data: result.items };
}

export async function incrementSequence(
  id: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  try {
    const rows = await sql<DocumentNumberingRow[]>`
      UPDATE "DocumentNumbering"
      SET "currentSequence" = "currentSequence" + 1
      WHERE id = ${id}
        AND "isArchived" = false
      RETURNING
        id,
        prefix,
        description,
        "prefixFormat",
        separator,
        "yearFormat",
        "monthFormat",
        "dayFormat",
        "sequenceLength",
        "currentSequence",
        "isActive",
        "isArchived"
    `;

    if (!rows[0]) {
      return { success: false, error: "Document numbering configuration not found" };
    }

    return {
      success: true,
      data: mapRow(rows[0]),
      message: "Sequence incremented",
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Failed to increment sequence",
    };
  }
}

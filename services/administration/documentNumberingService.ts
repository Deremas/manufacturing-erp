// ----------------------------------------------------------------------------
// KONEL ERP — Document Numbering Service
// ----------------------------------------------------------------------------
// Manages document numbering configuration CRUD with in-memory store.
// TODO: Replace with Prisma database queries.

import type {
  DocumentNumberingConfig,
  CreateDocumentNumberingInput,
  UpdateDocumentNumberingInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/administration";
import { AuditAction } from "@/services/audit/auditLog";

const configs: DocumentNumberingConfig[] = [];
let idCounter = 0;

function nextId(): string {
  idCounter += 1;
  return `dn-${Date.now()}-${idCounter}`;
}

function now(): string {
  return new Date().toISOString();
}

function generateExample(config: DocumentNumberingConfig): string {
  const date = new Date();
  const YYYY = date.getFullYear().toString();
  const YY = YYYY.slice(2);
  const MM = (date.getMonth() + 1).toString().padStart(2, "0");
  const DD = date.getDate().toString().padStart(2, "0");
  const SEQ = (config.currentSequence + 1)
    .toString()
    .padStart(config.sequenceLength, "0");
  const sep = config.separator ?? "";

  let pattern = "";
  switch (config.prefixFormat) {
    case "PREFIX":
      pattern = `${config.prefix}`;
      break;
    case "PREFIX_YEAR":
      pattern = `${config.prefix}${sep}${YYYY}`;
      break;
    case "PREFIX_YEAR_MONTH":
      pattern = `${config.prefix}${sep}${YYYY}${sep}${MM}`;
      break;
    case "PREFIX_YEAR_MONTH_DAY":
      pattern = `${config.prefix}${sep}${YYYY}${sep}${MM}${sep}${DD}`;
      break;
    default:
      pattern = config.prefix;
  }

  return `${pattern}${sep}${SEQ}`;
}

async function recordAudit(
  action: AuditAction,
  recordId: string,
  userId: string,
  userName: string,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>,
): Promise<void> {
  const { createAuditLog } = await import("@/services/audit/auditLog");
  await createAuditLog({
    userId,
    userName,
    action,
    module: "DOCUMENT_NUMBERING",
    recordId,
    oldValue,
    newValue,
  });
}

export async function getAll(
  params?: QueryParams,
): Promise<PaginatedResult<DocumentNumberingConfig>> {
  let filtered = [...configs];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.prefix.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    );
  }
  if (params?.isActive !== undefined)
    filtered = filtered.filter((c) => c.isActive === params.isActive);
  if (params?.isArchived !== undefined)
    filtered = filtered.filter((c) => c.isArchived === params.isArchived);

  const total = filtered.length;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);

  // Generate example for each
  const withExamples = paginated.map((c) => ({
    ...c,
    example: generateExample(c),
  }));
  return { items: withExamples, total, page, limit, totalPages };
}

export async function getById(
  id: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  const config = configs.find((c) => c.id === id);
  if (!config)
    return { success: false, error: "DocumentNumbering config not found" };
  return {
    success: true,
    data: { ...config, example: generateExample(config) },
  };
}

export async function getByPrefix(
  prefix: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  const config = configs.find((c) => c.prefix === prefix && !c.isArchived);
  if (!config)
    return { success: false, error: "DocumentNumbering config not found" };
  return {
    success: true,
    data: { ...config, example: generateExample(config) },
  };
}

export async function create(
  input: CreateDocumentNumberingInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  const ts = now();
  const newConfig: DocumentNumberingConfig = {
    id: nextId(),
    prefix: input.prefix,
    description: input.description,
    prefixFormat: input.prefixFormat ?? "PREFIX",
    separator: input.separator ?? "",
    yearFormat: input.yearFormat ?? "YYYY",
    monthFormat: input.monthFormat ?? "MM",
    dayFormat: input.dayFormat ?? "DD",
    sequenceLength: input.sequenceLength ?? 4,
    currentSequence: input.currentSequence ?? 0,
    isActive: true,
    isArchived: false,
    createdAt: ts,
    updatedAt: ts,
  };
  configs.push(newConfig);
  await recordAudit(
    AuditAction.CREATE,
    newConfig.id,
    userId,
    userName,
    undefined,
    { ...newConfig },
  );
  return {
    success: true,
    data: { ...newConfig, example: generateExample(newConfig) },
    message: "Document numbering config created successfully",
  };
}

export async function update(
  id: string,
  input: UpdateDocumentNumberingInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  const idx = configs.findIndex((c) => c.id === id);
  if (idx === -1)
    return { success: false, error: "DocumentNumbering config not found" };
  const old = { ...configs[idx] };
  configs[idx] = { ...configs[idx], ...input, updatedAt: now() };
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...configs[idx],
  });
  return {
    success: true,
    data: { ...configs[idx], example: generateExample(configs[idx]) },
    message: "Document numbering config updated successfully",
  };
}

export async function deactivate(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  const idx = configs.findIndex((c) => c.id === id);
  if (idx === -1)
    return { success: false, error: "DocumentNumbering config not found" };
  const old = { ...configs[idx] };
  configs[idx].isActive = false;
  configs[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...configs[idx],
  });
  return {
    success: true,
    data: { ...configs[idx], example: generateExample(configs[idx]) },
    message: "Document numbering config deactivated successfully",
  };
}

export async function archive(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  const idx = configs.findIndex((c) => c.id === id);
  if (idx === -1)
    return { success: false, error: "DocumentNumbering config not found" };
  const old = { ...configs[idx] };
  configs[idx].isArchived = true;
  configs[idx].isActive = false;
  configs[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...configs[idx],
  });
  return {
    success: true,
    data: { ...configs[idx], example: generateExample(configs[idx]) },
    message: "Document numbering config archived successfully",
  };
}

export async function restore(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  const idx = configs.findIndex((c) => c.id === id);
  if (idx === -1)
    return { success: false, error: "DocumentNumbering config not found" };
  const old = { ...configs[idx] };
  configs[idx].isArchived = false;
  configs[idx].isActive = true;
  configs[idx].updatedAt = now();
  await recordAudit(AuditAction.UPDATE, id, userId, userName, old, {
    ...configs[idx],
  });
  return {
    success: true,
    data: { ...configs[idx], example: generateExample(configs[idx]) },
    message: "Document numbering config restored successfully",
  };
}

export async function search(
  query: string,
): Promise<ServiceResult<DocumentNumberingConfig[]>> {
  const q = query.toLowerCase();
  const results = configs.filter(
    (c) =>
      !c.isArchived &&
      (c.prefix.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q)),
  );
  return { success: true, data: results };
}

export async function incrementSequence(
  id: string,
): Promise<ServiceResult<DocumentNumberingConfig>> {
  const idx = configs.findIndex((c) => c.id === id);
  if (idx === -1)
    return { success: false, error: "DocumentNumbering config not found" };
  configs[idx].currentSequence += 1;
  configs[idx].updatedAt = now();
  return {
    success: true,
    data: { ...configs[idx], example: generateExample(configs[idx]) },
    message: "Sequence incremented",
  };
}

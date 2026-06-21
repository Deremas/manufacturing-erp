// ----------------------------------------------------------------------------
// KONEL ERP — PriceList Service
// ----------------------------------------------------------------------------
// Manages PriceList & PriceListItem CRUD with in-memory store.
// TODO: Replace with Prisma database queries.

import type {
  PriceList,
  PriceListItem,
  CreatePriceListInput,
  UpdatePriceListInput,
  CreatePriceListItemInput,
  UpdatePriceListItemInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/master-data";
import { AuditAction } from "@/services/audit/auditLog";

const priceLists: PriceList[] = [];
const priceListItems: PriceListItem[] = [];
let plIdCounter = 0;
let pliIdCounter = 0;

function nextPlId(): string {
  plIdCounter += 1;
  return `pl-${Date.now()}-${plIdCounter}`;
}

function nextPliId(): string {
  pliIdCounter += 1;
  return `pli-${Date.now()}-${pliIdCounter}`;
}

function now(): string {
  return new Date().toISOString();
}

async function recordAudit(
  action: AuditAction,
  recordId: string,
  userId: string,
  userName: string,
  module: string,
  oldValue?: Record<string, unknown>,
  newValue?: Record<string, unknown>,
): Promise<void> {
  const { createAuditLog } = await import("@/services/audit/auditLog");
  await createAuditLog({
    userId,
    userName,
    action,
    module,
    recordId,
    oldValue,
    newValue,
  });
}

// ── PriceList ─────────────────────────────────────────────────────────────────

export async function getAll(
  params?: QueryParams,
): Promise<PaginatedResult<PriceList>> {
  let filtered = [...priceLists];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (p) =>
        p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q),
    );
  }
  if (params?.isActive !== undefined)
    filtered = filtered.filter((p) => p.isActive === params.isActive);
  if (params?.isArchived !== undefined)
    filtered = filtered.filter((p) => p.isArchived === params.isArchived);

  const total = filtered.length;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const paginated = filtered.slice(start, start + limit);
  return { items: paginated, total, page, limit, totalPages };
}

export async function getById(id: string): Promise<ServiceResult<PriceList>> {
  const pl = priceLists.find((p) => p.id === id);
  if (!pl) return { success: false, error: "PriceList not found" };
  const items = priceListItems.filter((i) => i.priceListId === id);
  return { success: true, data: { ...pl, items } };
}

export async function create(
  input: CreatePriceListInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<PriceList>> {
  const ts = now();
  const newPl: PriceList = {
    id: nextPlId(),
    code: input.code,
    name: input.name,
    currency: input.currency ?? "ETB",
    customerGroup: input.customerGroup,
    price: input.price,
    effectiveDate: input.effectiveDate,
    effectiveFrom: input.effectiveFrom,
    effectiveTo: input.effectiveTo,
    customerId: input.customerId,
    locationId: input.locationId,
    createdById: userId,
    updatedById: userId,
    isActive: true,
    isArchived: false,
    createdAt: ts,
    updatedAt: ts,
  };
  priceLists.push(newPl);
  await recordAudit(
    AuditAction.CREATE,
    newPl.id,
    userId,
    userName,
    "PRICE_LIST",
    undefined,
    { ...newPl },
  );
  return {
    success: true,
    data: newPl,
    message: "PriceList created successfully",
  };
}

export async function update(
  id: string,
  input: UpdatePriceListInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<PriceList>> {
  const idx = priceLists.findIndex((p) => p.id === id);
  if (idx === -1) return { success: false, error: "PriceList not found" };
  const old = { ...priceLists[idx] };
  priceLists[idx] = {
    ...priceLists[idx],
    ...input,
    updatedById: userId,
    updatedAt: now(),
  };
  await recordAudit(
    AuditAction.UPDATE,
    id,
    userId,
    userName,
    "PRICE_LIST",
    old,
    { ...priceLists[idx] },
  );
  return {
    success: true,
    data: priceLists[idx],
    message: "PriceList updated successfully",
  };
}

export async function deactivate(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<PriceList>> {
  const idx = priceLists.findIndex((p) => p.id === id);
  if (idx === -1) return { success: false, error: "PriceList not found" };
  const old = { ...priceLists[idx] };
  priceLists[idx].isActive = false;
  priceLists[idx].updatedById = userId;
  priceLists[idx].updatedAt = now();
  await recordAudit(
    AuditAction.UPDATE,
    id,
    userId,
    userName,
    "PRICE_LIST",
    old,
    { ...priceLists[idx] },
  );
  return {
    success: true,
    data: priceLists[idx],
    message: "PriceList deactivated successfully",
  };
}

export async function archive(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<PriceList>> {
  const idx = priceLists.findIndex((p) => p.id === id);
  if (idx === -1) return { success: false, error: "PriceList not found" };
  const old = { ...priceLists[idx] };
  priceLists[idx].isArchived = true;
  priceLists[idx].isActive = false;
  priceLists[idx].updatedById = userId;
  priceLists[idx].updatedAt = now();
  await recordAudit(
    AuditAction.UPDATE,
    id,
    userId,
    userName,
    "PRICE_LIST",
    old,
    { ...priceLists[idx] },
  );
  return {
    success: true,
    data: priceLists[idx],
    message: "PriceList archived successfully",
  };
}

export async function restore(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<PriceList>> {
  const idx = priceLists.findIndex((p) => p.id === id);
  if (idx === -1) return { success: false, error: "PriceList not found" };
  const old = { ...priceLists[idx] };
  priceLists[idx].isArchived = false;
  priceLists[idx].isActive = true;
  priceLists[idx].updatedById = userId;
  priceLists[idx].updatedAt = now();
  await recordAudit(
    AuditAction.UPDATE,
    id,
    userId,
    userName,
    "PRICE_LIST",
    old,
    { ...priceLists[idx] },
  );
  return {
    success: true,
    data: priceLists[idx],
    message: "PriceList restored successfully",
  };
}

export async function search(
  query: string,
): Promise<ServiceResult<PriceList[]>> {
  const q = query.toLowerCase();
  const results = priceLists.filter(
    (p) =>
      !p.isArchived &&
      (p.name?.toLowerCase().includes(q) || p.code?.toLowerCase().includes(q)),
  );
  return { success: true, data: results };
}

// ── PriceListItem ─────────────────────────────────────────────────────────────

export async function getPriceListItems(
  priceListId: string,
): Promise<ServiceResult<PriceListItem[]>> {
  const items = priceListItems.filter((i) => i.priceListId === priceListId);
  return { success: true, data: items };
}

export async function createPriceListItem(
  input: CreatePriceListItemInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<PriceListItem>> {
  const ts = now();
  const newItem: PriceListItem = {
    id: nextPliId(),
    priceListId: input.priceListId,
    itemId: input.itemId,
    unitId: input.unitId,
    sellingPrice: input.sellingPrice,
    minimumPrice: input.minimumPrice,
    taxIncluded: input.taxIncluded ?? false,
    isActive: true,
    isArchived: false,
    createdAt: ts,
    updatedAt: ts,
  };
  priceListItems.push(newItem);
  await recordAudit(
    AuditAction.CREATE,
    newItem.id,
    userId,
    userName,
    "PRICE_LIST_ITEM",
    undefined,
    { ...newItem },
  );
  return {
    success: true,
    data: newItem,
    message: "PriceListItem created successfully",
  };
}

export async function updatePriceListItem(
  id: string,
  input: UpdatePriceListItemInput,
  userId: string,
  userName: string,
): Promise<ServiceResult<PriceListItem>> {
  const idx = priceListItems.findIndex((i) => i.id === id);
  if (idx === -1) return { success: false, error: "PriceListItem not found" };
  const old = { ...priceListItems[idx] };
  priceListItems[idx] = { ...priceListItems[idx], ...input, updatedAt: now() };
  await recordAudit(
    AuditAction.UPDATE,
    id,
    userId,
    userName,
    "PRICE_LIST_ITEM",
    old,
    { ...priceListItems[idx] },
  );
  return {
    success: true,
    data: priceListItems[idx],
    message: "PriceListItem updated successfully",
  };
}

export async function deletePriceListItem(
  id: string,
  userId: string,
  userName: string,
): Promise<ServiceResult<void>> {
  const idx = priceListItems.findIndex((i) => i.id === id);
  if (idx === -1) return { success: false, error: "PriceListItem not found" };
  const old = { ...priceListItems[idx] };
  priceListItems.splice(idx, 1);
  await recordAudit(
    AuditAction.DELETE,
    id,
    userId,
    userName,
    "PRICE_LIST_ITEM",
    old,
    undefined,
  );
  return { success: true, message: "PriceListItem deleted successfully" };
}

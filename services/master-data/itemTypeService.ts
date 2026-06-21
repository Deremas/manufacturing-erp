import type {
  ItemType,
  CreateItemTypeInput,
  UpdateItemTypeInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/master-data";

const BASE_URL = "/api/master-data/item-types";

async function requestJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(payload.error || `Request failed with ${response.status}`);
  }

  return (await response.json()) as T;
}

function paginate(
  items: ItemType[],
  params?: QueryParams,
): PaginatedResult<ItemType> {
  let filtered = [...items];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        t.code.toLowerCase().includes(q) ||
        (t.description ?? "").toLowerCase().includes(q),
    );
  }
  if (params?.isActive !== undefined) {
    filtered = filtered.filter((t) => t.isActive === params.isActive);
  }
  if (params?.isArchived !== undefined) {
    filtered = filtered.filter((t) => t.isArchived === params.isArchived);
  }

  const total = filtered.length;
  const page = params?.page ?? 1;
  const limit = params?.limit ?? 50;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;

  return {
    items: filtered.slice(start, start + limit),
    total,
    page,
    limit,
    totalPages,
  };
}

export async function getAll(
  params?: QueryParams,
): Promise<PaginatedResult<ItemType>> {
  const items = await requestJson<ItemType[]>(BASE_URL);
  return paginate(items, params);
}

export async function getById(id: string): Promise<ServiceResult<ItemType>> {
  try {
    const item = await requestJson<ItemType>(`${BASE_URL}/${id}`);
    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "ItemType not found" };
  }
}

export async function create(
  input: CreateItemTypeInput,
): Promise<ServiceResult<ItemType>> {
  try {
    const result = await requestJson<{ success: boolean; id: string }>(BASE_URL, {
      method: "POST",
      body: JSON.stringify(input),
    });
    return {
      success: true,
      data: {
        id: result.id,
        code: input.code,
        name: input.name,
        description: input.description,
        isActive: true,
        isArchived: false,
        createdAt: "",
        updatedAt: "",
      },
      message: "ItemType created successfully",
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create item type" };
  }
}

export async function update(
  id: string,
  input: UpdateItemTypeInput,
): Promise<ServiceResult<ItemType>> {
  try {
    await requestJson<{ success: boolean; id: string }>(`${BASE_URL}/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    const data = await requestJson<ItemType>(`${BASE_URL}/${id}`);
    return { success: true, data, message: "ItemType updated successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update item type" };
  }
}

export async function deactivate(id: string): Promise<ServiceResult<ItemType>> {
  return update(id, { isActive: false } as UpdateItemTypeInput);
}

export async function archive(id: string): Promise<ServiceResult<ItemType>> {
  return update(id, { isActive: false } as UpdateItemTypeInput);
}

export async function restore(id: string): Promise<ServiceResult<ItemType>> {
  return update(id, { isActive: true } as UpdateItemTypeInput);
}

export async function search(query: string): Promise<ServiceResult<ItemType[]>> {
  try {
    const items = await requestJson<ItemType[]>(BASE_URL);
    const q = query.toLowerCase();
    const results = items.filter(
      (t) =>
        !t.isArchived &&
        (t.name.toLowerCase().includes(q) || t.code.toLowerCase().includes(q)),
    );
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to search item types" };
  }
}

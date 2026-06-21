import type {
  Item,
  CreateItemInput,
  UpdateItemInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/master-data";

const BASE_URL = "/api/master-data/items";

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

function paginate(items: Item[], params?: QueryParams): PaginatedResult<Item> {
  let filtered = [...items];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (item) =>
        item.itemName.toLowerCase().includes(q) ||
        item.itemCode.toLowerCase().includes(q) ||
        item.sku?.toLowerCase().includes(q),
    );
  }
  if (params?.isActive !== undefined) {
    filtered = filtered.filter((item) => item.isActive === params.isActive);
  }
  if (params?.isArchived !== undefined) {
    filtered = filtered.filter((item) => item.isArchived === params.isArchived);
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
): Promise<PaginatedResult<Item>> {
  const items = await requestJson<Item[]>(BASE_URL);
  return paginate(items, params);
}

export async function getById(id: string): Promise<ServiceResult<Item>> {
  try {
    const item = await requestJson<Item>(`${BASE_URL}/${id}`);
    return { success: true, data: item };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Item not found",
    };
  }
}

export async function create(
  input: CreateItemInput,
): Promise<ServiceResult<Item>> {
  try {
    const result = await requestJson<{ success: boolean; id: string }>(BASE_URL, {
      method: "POST",
      body: JSON.stringify(input),
    });
    const data = await requestJson<Item>(`${BASE_URL}/${result.id}`);
    return { success: true, data, message: "Item created successfully" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to create item",
    };
  }
}

export async function update(
  id: string,
  input: UpdateItemInput,
): Promise<ServiceResult<Item>> {
  try {
    await requestJson<{ success: boolean; id: string }>(`${BASE_URL}/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    const data = await requestJson<Item>(`${BASE_URL}/${id}`);
    return { success: true, data, message: "Item updated successfully" };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to update item",
    };
  }
}

export async function deactivate(id: string): Promise<ServiceResult<Item>> {
  return update(id, { isActive: false });
}

export async function archive(id: string): Promise<ServiceResult<Item>> {
  return update(id, { isActive: false, isArchived: true });
}

export async function restore(id: string): Promise<ServiceResult<Item>> {
  return update(id, { isActive: true, isArchived: false });
}

export async function search(query: string): Promise<ServiceResult<Item[]>> {
  try {
    const items = await requestJson<Item[]>(BASE_URL);
    const q = query.toLowerCase();
    const results = items.filter(
      (item) =>
        !item.isArchived &&
        (item.itemName.toLowerCase().includes(q) ||
          item.itemCode.toLowerCase().includes(q) ||
          item.sku?.toLowerCase().includes(q)),
    );
    return { success: true, data: results };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to search items",
    };
  }
}

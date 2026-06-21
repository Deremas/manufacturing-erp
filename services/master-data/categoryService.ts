import type {
  Category,
  CreateCategoryInput,
  UpdateCategoryInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/master-data";

const BASE_URL = "/api/master-data/categories";

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

function paginate(items: Category[], params?: QueryParams): PaginatedResult<Category> {
  let filtered = [...items];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q),
    );
  }
  if (params?.isActive !== undefined) {
    filtered = filtered.filter((c) => c.isActive === params.isActive);
  }
  if (params?.isArchived !== undefined) {
    filtered = filtered.filter((c) => c.isArchived === params.isArchived);
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
): Promise<PaginatedResult<Category>> {
  const items = await requestJson<Category[]>(BASE_URL);
  return paginate(items, params);
}

export async function getById(id: string): Promise<ServiceResult<Category>> {
  try {
    const item = await requestJson<Category>(`${BASE_URL}/${id}`);
    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Category not found" };
  }
}

export async function create(
  input: CreateCategoryInput,
): Promise<ServiceResult<Category>> {
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
        parentCategoryId: input.parentCategoryId,
        description: input.description,
        displayOrder: input.displayOrder ?? 0,
        isActive: true,
        isArchived: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as Category,
      message: "Category created successfully",
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create category" };
  }
}

export async function update(
  id: string,
  input: UpdateCategoryInput,
): Promise<ServiceResult<Category>> {
  try {
    await requestJson<{ success: boolean; id: string }>(`${BASE_URL}/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    const data = await requestJson<Category>(`${BASE_URL}/${id}`);
    return { success: true, data, message: "Category updated successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update category" };
  }
}

export async function deactivate(id: string): Promise<ServiceResult<Category>> {
  return update(id, { isActive: false } as UpdateCategoryInput);
}

export async function archive(id: string): Promise<ServiceResult<Category>> {
  return update(id, { isActive: false } as UpdateCategoryInput);
}

export async function restore(id: string): Promise<ServiceResult<Category>> {
  return update(id, { isActive: true } as UpdateCategoryInput);
}

export async function search(query: string): Promise<ServiceResult<Category[]>> {
  try {
    const items = await requestJson<Category[]>(BASE_URL);
    const q = query.toLowerCase();
    const results = items.filter(
      (c) =>
        !c.isArchived &&
        (c.name.toLowerCase().includes(q) ||
          c.code?.toLowerCase().includes(q) ||
          c.description?.toLowerCase().includes(q)),
    );
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to search categories" };
  }
}

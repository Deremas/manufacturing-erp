import type {
  Unit,
  CreateUnitInput,
  UpdateUnitInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/master-data";

const BASE_URL = "/api/master-data/units";

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

function paginate(items: Unit[], params?: QueryParams): PaginatedResult<Unit> {
  let filtered = [...items];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (u) =>
        u.name.toLowerCase().includes(q) ||
        u.abbreviation.toLowerCase().includes(q) ||
        (u.code ?? "").toLowerCase().includes(q) ||
        u.type.toLowerCase().includes(q),
    );
  }
  if (params?.isActive !== undefined) {
    filtered = filtered.filter((u) => u.isActive === params.isActive);
  }
  if (params?.isArchived !== undefined) {
    filtered = filtered.filter((u) => u.isArchived === params.isArchived);
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
): Promise<PaginatedResult<Unit>> {
  const items = await requestJson<Unit[]>(BASE_URL);
  return paginate(items, params);
}

export async function getById(id: string): Promise<ServiceResult<Unit>> {
  try {
    const item = await requestJson<Unit>(`${BASE_URL}/${id}`);
    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Unit not found" };
  }
}

export async function create(input: CreateUnitInput): Promise<ServiceResult<Unit>> {
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
        abbreviation: input.abbreviation,
        type: input.type,
        decimalPrecision: input.decimalPrecision ?? 0,
        isActive: true,
        isArchived: false,
        createdAt: "",
        updatedAt: "",
      },
      message: "Unit created successfully",
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to create unit" };
  }
}

export async function update(
  id: string,
  input: UpdateUnitInput,
): Promise<ServiceResult<Unit>> {
  try {
    await requestJson<{ success: boolean; id: string }>(`${BASE_URL}/${id}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
    const data = await requestJson<Unit>(`${BASE_URL}/${id}`);
    return { success: true, data, message: "Unit updated successfully" };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to update unit" };
  }
}

export async function deactivate(id: string): Promise<ServiceResult<Unit>> {
  return update(id, { isActive: false } as UpdateUnitInput);
}

export async function archive(id: string): Promise<ServiceResult<Unit>> {
  return update(id, { isActive: false } as UpdateUnitInput);
}

export async function restore(id: string): Promise<ServiceResult<Unit>> {
  return update(id, { isActive: true } as UpdateUnitInput);
}

export async function search(query: string): Promise<ServiceResult<Unit[]>> {
  try {
    const items = await requestJson<Unit[]>(BASE_URL);
    const q = query.toLowerCase();
    const results = items.filter(
      (u) =>
        !u.isArchived &&
        (u.name.toLowerCase().includes(q) ||
          u.abbreviation.toLowerCase().includes(q) ||
          (u.code ?? "").toLowerCase().includes(q)),
    );
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to search units" };
  }
}

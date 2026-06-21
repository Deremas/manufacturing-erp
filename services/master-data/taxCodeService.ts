import type {
  TaxCode,
  CreateTaxCodeInput,
  UpdateTaxCodeInput,
  ServiceResult,
  QueryParams,
  PaginatedResult,
} from "@/types/master-data";

const BASE_URL = "/api/master-data/tax-codes";

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
  items: TaxCode[],
  params?: QueryParams,
): PaginatedResult<TaxCode> {
  let filtered = [...items];
  if (params?.search) {
    const q = params.search.toLowerCase();
    filtered = filtered.filter(
      (t) =>
        t.taxName.toLowerCase().includes(q) ||
        t.taxType.toLowerCase().includes(q) ||
        (t.code ?? "").toLowerCase().includes(q),
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
): Promise<PaginatedResult<TaxCode>> {
  const items = await requestJson<TaxCode[]>(BASE_URL);
  return paginate(items, params);
}

export async function getById(id: string): Promise<ServiceResult<TaxCode>> {
  try {
    const item = await requestJson<TaxCode>(`${BASE_URL}/${id}`);
    return { success: true, data: item };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "TaxCode not found" };
  }
}

export async function create(
  input: CreateTaxCodeInput,
): Promise<ServiceResult<TaxCode>> {
  return {
    success: false,
    error: "Use the Tax Code API route for mutations",
  };
}

export async function update(
  id: string,
  input: UpdateTaxCodeInput,
): Promise<ServiceResult<TaxCode>> {
  return {
    success: false,
    error: "Use the Tax Code API route for mutations",
  };
}

export async function deactivate(id: string): Promise<ServiceResult<TaxCode>> {
  return update(id, { isActive: false } as UpdateTaxCodeInput);
}

export async function archive(id: string): Promise<ServiceResult<TaxCode>> {
  return update(id, { isActive: false } as UpdateTaxCodeInput);
}

export async function restore(id: string): Promise<ServiceResult<TaxCode>> {
  return update(id, { isActive: true } as UpdateTaxCodeInput);
}

export async function search(query: string): Promise<ServiceResult<TaxCode[]>> {
  try {
    const items = await requestJson<TaxCode[]>(BASE_URL);
    const q = query.toLowerCase();
    const results = items.filter(
      (t) =>
        !t.isArchived &&
        (t.taxName.toLowerCase().includes(q) ||
          t.taxType.toLowerCase().includes(q) ||
          (t.code ?? "").toLowerCase().includes(q)),
    );
    return { success: true, data: results };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Failed to search tax codes" };
  }
}

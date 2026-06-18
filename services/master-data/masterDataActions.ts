// ----------------------------------------------------------------------------
// KONEL ERP — Master Data Server Actions
// ----------------------------------------------------------------------------
"use server";

import {
  itemSchema,
  categorySchema,
  unitSchema,
  customerSchema,
  supplierSchema,
  departmentSchema,
  bankSchema,
  bankAccountSchema,
  locationSchema,
  priceListSchema,
  taxCodeSchema,
} from "@/validators/master-data";
import type {
  ItemInput,
  CategoryInput,
  UnitInput,
  CustomerInput,
  SupplierInput,
  DepartmentInput,
  BankInput,
  BankAccountInput,
  LocationInput,
  PriceListInput,
  TaxCodeInput,
} from "@/validators/master-data";
import { createAuditLog, AuditAction } from "@/services/audit/auditLog";
import type {
  Item,
  Category,
  Unit,
  Customer,
  Supplier,
  Department,
  Bank,
  BankAccount,
  Location,
  PriceList,
  TaxCode,
} from "@/features/master-data/types";

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------
export interface ActionResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  errors?: Record<string, string[]>;
}

// ----------------------------------------------------------------------------
// In-Memory Store (placeholder — replace with DB in production)
// ----------------------------------------------------------------------------
const items: Item[] = [];
const categories: Category[] = [];
const units: Unit[] = [];
const customers: Customer[] = [];
const suppliers: Supplier[] = [];
const departments: Department[] = [];
const banks: Bank[] = [];
const bankAccounts: BankAccount[] = [];
const locations: Location[] = [];
const priceLists: PriceList[] = [];
const taxCodes: TaxCode[] = [];

let idCounter = 0;
function nextId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now()}-${idCounter}`;
}

function toISO(): string {
  return new Date().toISOString();
}

// ----------------------------------------------------------------------------
// ─── ITEMS ──────────────────────────────────────────────────────────────────
// ----------------------------------------------------------------------------

export async function createItem(data: ItemInput): Promise<ActionResult<Item>> {
  const parsed = itemSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const item: Item = {
    id: nextId("ITM"),
    ...parsed.data,
    createdAt: toISO(),
    updatedAt: toISO(),
  };

  items.push(item);

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.CREATE,
    module: "Items",
    recordId: item.id,
    newValue: item as unknown as Record<string, unknown>,
  });

  return { success: true, data: item };
}

export async function updateItem(
  id: string,
  data: Partial<ItemInput>,
): Promise<ActionResult<Item>> {
  const parsed = itemSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const index = items.findIndex((i) => i.id === id);
  if (index === -1) return { success: false, error: "Item not found" };

  const oldValue = { ...items[index] };
  items[index] = { ...items[index], ...parsed.data, updatedAt: toISO() };

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.UPDATE,
    module: "Items",
    recordId: id,
    oldValue: oldValue as unknown as Record<string, unknown>,
    newValue: items[index] as unknown as Record<string, unknown>,
  });

  return { success: true, data: items[index] };
}

export async function getItem(id: string): Promise<ActionResult<Item>> {
  const item = items.find((i) => i.id === id);
  if (!item) return { success: false, error: "Item not found" };
  return { success: true, data: item };
}

export async function getItems(
  filters?: Record<string, string>,
): Promise<ActionResult<Item[]>> {
  let result = [...items];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (i) =>
        i.itemCode.toLowerCase().includes(s) ||
        i.itemName.toLowerCase().includes(s) ||
        i.sku.toLowerCase().includes(s),
    );
  }
  if (filters?.categoryId) {
    result = result.filter((i) => i.categoryId === filters.categoryId);
  }
  if (filters?.itemType) {
    result = result.filter((i) => i.itemType === filters.itemType);
  }
  if (filters?.status === "true") {
    result = result.filter((i) => i.isActive);
  } else if (filters?.status === "false") {
    result = result.filter((i) => !i.isActive);
  }

  return { success: true, data: result };
}

// ----------------------------------------------------------------------------
// ─── CATEGORIES ─────────────────────────────────────────────────────────────
// ----------------------------------------------------------------------------

export async function createCategory(
  data: CategoryInput,
): Promise<ActionResult<Category>> {
  const parsed = categorySchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const category: Category = {
    id: nextId("CAT"),
    ...parsed.data,
  };

  categories.push(category);

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.CREATE,
    module: "Categories",
    recordId: category.id,
    newValue: category as unknown as Record<string, unknown>,
  });

  return { success: true, data: category };
}

export async function updateCategory(
  id: string,
  data: Partial<CategoryInput>,
): Promise<ActionResult<Category>> {
  const parsed = categorySchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const index = categories.findIndex((c) => c.id === id);
  if (index === -1) return { success: false, error: "Category not found" };

  const oldValue = { ...categories[index] };
  categories[index] = { ...categories[index], ...parsed.data };

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.UPDATE,
    module: "Categories",
    recordId: id,
    oldValue: oldValue as unknown as Record<string, unknown>,
    newValue: categories[index] as unknown as Record<string, unknown>,
  });

  return { success: true, data: categories[index] };
}

export async function getCategory(id: string): Promise<ActionResult<Category>> {
  const category = categories.find((c) => c.id === id);
  if (!category) return { success: false, error: "Category not found" };
  return { success: true, data: category };
}

export async function getCategories(): Promise<ActionResult<Category[]>> {
  return { success: true, data: [...categories] };
}

// ----------------------------------------------------------------------------
// ─── UNITS ──────────────────────────────────────────────────────────────────
// ----------------------------------------------------------------------------

export async function createUnit(data: UnitInput): Promise<ActionResult<Unit>> {
  const parsed = unitSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const unit: Unit = {
    id: nextId("UOM"),
    ...parsed.data,
  };

  units.push(unit);

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.CREATE,
    module: "Units",
    recordId: unit.id,
    newValue: unit as unknown as Record<string, unknown>,
  });

  return { success: true, data: unit };
}

export async function updateUnit(
  id: string,
  data: Partial<UnitInput>,
): Promise<ActionResult<Unit>> {
  const parsed = unitSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const index = units.findIndex((u) => u.id === id);
  if (index === -1) return { success: false, error: "Unit not found" };

  const oldValue = { ...units[index] };
  units[index] = { ...units[index], ...parsed.data };

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.UPDATE,
    module: "Units",
    recordId: id,
    oldValue: oldValue as unknown as Record<string, unknown>,
    newValue: units[index] as unknown as Record<string, unknown>,
  });

  return { success: true, data: units[index] };
}

export async function getUnit(id: string): Promise<ActionResult<Unit>> {
  const unit = units.find((u) => u.id === id);
  if (!unit) return { success: false, error: "Unit not found" };
  return { success: true, data: unit };
}

export async function getUnits(
  filters?: Record<string, string>,
): Promise<ActionResult<Unit[]>> {
  let result = [...units];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (u) =>
        u.name.toLowerCase().includes(s) ||
        u.abbreviation.toLowerCase().includes(s),
    );
  }
  if (filters?.type) {
    result = result.filter((u) => u.type === filters.type);
  }
  if (filters?.status === "true") {
    result = result.filter((u) => u.isActive);
  } else if (filters?.status === "false") {
    result = result.filter((u) => !u.isActive);
  }

  return { success: true, data: result };
}

// ----------------------------------------------------------------------------
// ─── CUSTOMERS ──────────────────────────────────────────────────────────────
// ----------------------------------------------------------------------------

export async function createCustomer(
  data: CustomerInput,
): Promise<ActionResult<Customer>> {
  const parsed = customerSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const customer: Customer = {
    id: nextId("CUS"),
    ...parsed.data,
  };

  customers.push(customer);

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.CREATE,
    module: "Customers",
    recordId: customer.id,
    newValue: customer as unknown as Record<string, unknown>,
  });

  return { success: true, data: customer };
}

export async function updateCustomer(
  id: string,
  data: Partial<CustomerInput>,
): Promise<ActionResult<Customer>> {
  const parsed = customerSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const index = customers.findIndex((c) => c.id === id);
  if (index === -1) return { success: false, error: "Customer not found" };

  const oldValue = { ...customers[index] };
  customers[index] = { ...customers[index], ...parsed.data };

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.UPDATE,
    module: "Customers",
    recordId: id,
    oldValue: oldValue as unknown as Record<string, unknown>,
    newValue: customers[index] as unknown as Record<string, unknown>,
  });

  return { success: true, data: customers[index] };
}

export async function getCustomer(id: string): Promise<ActionResult<Customer>> {
  const customer = customers.find((c) => c.id === id);
  if (!customer) return { success: false, error: "Customer not found" };
  return { success: true, data: customer };
}

export async function getCustomers(
  filters?: Record<string, string>,
): Promise<ActionResult<Customer[]>> {
  let result = [...customers];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (c) =>
        c.name.toLowerCase().includes(s) ||
        c.customerCode.toLowerCase().includes(s),
    );
  }
  if (filters?.status === "true") {
    result = result.filter((c) => c.isActive);
  } else if (filters?.status === "false") {
    result = result.filter((c) => !c.isActive);
  }

  return { success: true, data: result };
}

// ----------------------------------------------------------------------------
// ─── SUPPLIERS ──────────────────────────────────────────────────────────────
// ----------------------------------------------------------------------------

export async function createSupplier(
  data: SupplierInput,
): Promise<ActionResult<Supplier>> {
  const parsed = supplierSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const supplier: Supplier = {
    id: nextId("SUP"),
    ...parsed.data,
  };

  suppliers.push(supplier);

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.CREATE,
    module: "Suppliers",
    recordId: supplier.id,
    newValue: supplier as unknown as Record<string, unknown>,
  });

  return { success: true, data: supplier };
}

export async function updateSupplier(
  id: string,
  data: Partial<SupplierInput>,
): Promise<ActionResult<Supplier>> {
  const parsed = supplierSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const index = suppliers.findIndex((s) => s.id === id);
  if (index === -1) return { success: false, error: "Supplier not found" };

  const oldValue = { ...suppliers[index] };
  suppliers[index] = { ...suppliers[index], ...parsed.data };

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.UPDATE,
    module: "Suppliers",
    recordId: id,
    oldValue: oldValue as unknown as Record<string, unknown>,
    newValue: suppliers[index] as unknown as Record<string, unknown>,
  });

  return { success: true, data: suppliers[index] };
}

export async function getSupplier(id: string): Promise<ActionResult<Supplier>> {
  const supplier = suppliers.find((s) => s.id === id);
  if (!supplier) return { success: false, error: "Supplier not found" };
  return { success: true, data: supplier };
}

export async function getSuppliers(
  filters?: Record<string, string>,
): Promise<ActionResult<Supplier[]>> {
  let result = [...suppliers];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (supp) =>
        supp.name.toLowerCase().includes(s) ||
        supp.supplierCode.toLowerCase().includes(s),
    );
  }
  if (filters?.status === "true") {
    result = result.filter((s) => s.isActive);
  } else if (filters?.status === "false") {
    result = result.filter((s) => !s.isActive);
  }

  return { success: true, data: result };
}

// ----------------------------------------------------------------------------
// ─── DEPARTMENTS ────────────────────────────────────────────────────────────
// ----------------------------------------------------------------------------

export async function createDepartment(
  data: DepartmentInput,
): Promise<ActionResult<Department>> {
  const parsed = departmentSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const department: Department = {
    id: nextId("DEPT"),
    ...parsed.data,
  };

  departments.push(department);

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.CREATE,
    module: "Departments",
    recordId: department.id,
    newValue: department as unknown as Record<string, unknown>,
  });

  return { success: true, data: department };
}

export async function updateDepartment(
  id: string,
  data: Partial<DepartmentInput>,
): Promise<ActionResult<Department>> {
  const parsed = departmentSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const index = departments.findIndex((d) => d.id === id);
  if (index === -1) return { success: false, error: "Department not found" };

  const oldValue = { ...departments[index] };
  departments[index] = { ...departments[index], ...parsed.data };

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.UPDATE,
    module: "Departments",
    recordId: id,
    oldValue: oldValue as unknown as Record<string, unknown>,
    newValue: departments[index] as unknown as Record<string, unknown>,
  });

  return { success: true, data: departments[index] };
}

export async function getDepartment(
  id: string,
): Promise<ActionResult<Department>> {
  const department = departments.find((d) => d.id === id);
  if (!department) return { success: false, error: "Department not found" };
  return { success: true, data: department };
}

export async function getDepartments(
  filters?: Record<string, string>,
): Promise<ActionResult<Department[]>> {
  let result = [...departments];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (d) =>
        d.name.toLowerCase().includes(s) || d.code.toLowerCase().includes(s),
    );
  }
  if (filters?.status === "true") {
    result = result.filter((d) => d.isActive);
  } else if (filters?.status === "false") {
    result = result.filter((d) => !d.isActive);
  }

  return { success: true, data: result };
}

// ----------------------------------------------------------------------------
// ─── BANKS ──────────────────────────────────────────────────────────────────
// ----------------------------------------------------------------------------

export async function createBank(data: BankInput): Promise<ActionResult<Bank>> {
  const parsed = bankSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const bank: Bank = {
    id: nextId("BNK"),
    ...parsed.data,
  };

  banks.push(bank);

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.CREATE,
    module: "Banks",
    recordId: bank.id,
    newValue: bank as unknown as Record<string, unknown>,
  });

  return { success: true, data: bank };
}

export async function updateBank(
  id: string,
  data: Partial<BankInput>,
): Promise<ActionResult<Bank>> {
  const parsed = bankSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const index = banks.findIndex((b) => b.id === id);
  if (index === -1) return { success: false, error: "Bank not found" };

  const oldValue = { ...banks[index] };
  banks[index] = { ...banks[index], ...parsed.data };

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.UPDATE,
    module: "Banks",
    recordId: id,
    oldValue: oldValue as unknown as Record<string, unknown>,
    newValue: banks[index] as unknown as Record<string, unknown>,
  });

  return { success: true, data: banks[index] };
}

export async function getBank(id: string): Promise<ActionResult<Bank>> {
  const bank = banks.find((b) => b.id === id);
  if (!bank) return { success: false, error: "Bank not found" };
  return { success: true, data: bank };
}

export async function getBanks(): Promise<ActionResult<Bank[]>> {
  return { success: true, data: [...banks] };
}

// ----------------------------------------------------------------------------
// ─── BANK ACCOUNTS ──────────────────────────────────────────────────────────
// ----------------------------------------------------------------------------

export async function createBankAccount(
  data: BankAccountInput,
): Promise<ActionResult<BankAccount>> {
  const parsed = bankAccountSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const bankAccount: BankAccount = {
    id: nextId("BAC"),
    ...parsed.data,
  };

  bankAccounts.push(bankAccount);

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.CREATE,
    module: "BankAccounts",
    recordId: bankAccount.id,
    newValue: bankAccount as unknown as Record<string, unknown>,
  });

  return { success: true, data: bankAccount };
}

export async function updateBankAccount(
  id: string,
  data: Partial<BankAccountInput>,
): Promise<ActionResult<BankAccount>> {
  const parsed = bankAccountSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const index = bankAccounts.findIndex((b) => b.id === id);
  if (index === -1) return { success: false, error: "Bank account not found" };

  const oldValue = { ...bankAccounts[index] };
  bankAccounts[index] = { ...bankAccounts[index], ...parsed.data };

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.UPDATE,
    module: "BankAccounts",
    recordId: id,
    oldValue: oldValue as unknown as Record<string, unknown>,
    newValue: bankAccounts[index] as unknown as Record<string, unknown>,
  });

  return { success: true, data: bankAccounts[index] };
}

export async function getBankAccount(
  id: string,
): Promise<ActionResult<BankAccount>> {
  const bankAccount = bankAccounts.find((b) => b.id === id);
  if (!bankAccount) return { success: false, error: "Bank account not found" };
  return { success: true, data: bankAccount };
}

export async function getBankAccounts(
  filters?: Record<string, string>,
): Promise<ActionResult<BankAccount[]>> {
  let result = [...bankAccounts];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (b) =>
        b.accountName.toLowerCase().includes(s) ||
        b.accountCode.toLowerCase().includes(s) ||
        b.accountNumber.toLowerCase().includes(s),
    );
  }
  if (filters?.bankId) {
    result = result.filter((b) => b.bankId === filters.bankId);
  }
  if (filters?.status === "true") {
    result = result.filter((b) => b.isActive);
  } else if (filters?.status === "false") {
    result = result.filter((b) => !b.isActive);
  }

  return { success: true, data: result };
}

// ----------------------------------------------------------------------------
// ─── LOCATIONS ──────────────────────────────────────────────────────────────
// ----------------------------------------------------------------------------

export async function createLocation(
  data: LocationInput,
): Promise<ActionResult<Location>> {
  const parsed = locationSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const location: Location = {
    id: nextId("LOC"),
    ...parsed.data,
  };

  locations.push(location);

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.CREATE,
    module: "Locations",
    recordId: location.id,
    newValue: location as unknown as Record<string, unknown>,
  });

  return { success: true, data: location };
}

export async function updateLocation(
  id: string,
  data: Partial<LocationInput>,
): Promise<ActionResult<Location>> {
  const parsed = locationSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const index = locations.findIndex((l) => l.id === id);
  if (index === -1) return { success: false, error: "Location not found" };

  const oldValue = { ...locations[index] };
  locations[index] = { ...locations[index], ...parsed.data };

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.UPDATE,
    module: "Locations",
    recordId: id,
    oldValue: oldValue as unknown as Record<string, unknown>,
    newValue: locations[index] as unknown as Record<string, unknown>,
  });

  return { success: true, data: locations[index] };
}

export async function getLocation(id: string): Promise<ActionResult<Location>> {
  const location = locations.find((l) => l.id === id);
  if (!location) return { success: false, error: "Location not found" };
  return { success: true, data: location };
}

export async function getLocations(
  filters?: Record<string, string>,
): Promise<ActionResult<Location[]>> {
  let result = [...locations];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter(
      (l) =>
        l.locationName.toLowerCase().includes(s) ||
        l.locationCode.toLowerCase().includes(s),
    );
  }
  if (filters?.locationType) {
    result = result.filter((l) => l.locationType === filters.locationType);
  }
  if (filters?.status === "true") {
    result = result.filter((l) => l.isActive);
  } else if (filters?.status === "false") {
    result = result.filter((l) => !l.isActive);
  }

  return { success: true, data: result };
}

// ----------------------------------------------------------------------------
// ─── PRICE LISTS ────────────────────────────────────────────────────────────
// ----------------------------------------------------------------------------

export async function createPriceList(
  data: PriceListInput,
): Promise<ActionResult<PriceList>> {
  const parsed = priceListSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const priceList: PriceList = {
    id: nextId("PRL"),
    ...parsed.data,
  };

  priceLists.push(priceList);

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.CREATE,
    module: "PriceLists",
    recordId: priceList.id,
    newValue: priceList as unknown as Record<string, unknown>,
  });

  return { success: true, data: priceList };
}

export async function updatePriceList(
  id: string,
  data: Partial<PriceListInput>,
): Promise<ActionResult<PriceList>> {
  const parsed = priceListSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const index = priceLists.findIndex((p) => p.id === id);
  if (index === -1) return { success: false, error: "Price list not found" };

  const oldValue = { ...priceLists[index] };
  priceLists[index] = { ...priceLists[index], ...parsed.data };

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.UPDATE,
    module: "PriceLists",
    recordId: id,
    oldValue: oldValue as unknown as Record<string, unknown>,
    newValue: priceLists[index] as unknown as Record<string, unknown>,
  });

  return { success: true, data: priceLists[index] };
}

export async function getPriceList(
  id: string,
): Promise<ActionResult<PriceList>> {
  const priceList = priceLists.find((p) => p.id === id);
  if (!priceList) return { success: false, error: "Price list not found" };
  return { success: true, data: priceList };
}

export async function getPriceLists(
  filters?: Record<string, string>,
): Promise<ActionResult<PriceList[]>> {
  let result = [...priceLists];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter((p) => p.customerGroup.toLowerCase().includes(s));
  }
  if (filters?.itemId) {
    result = result.filter((p) => p.itemId === filters.itemId);
  }
  if (filters?.status === "true") {
    result = result.filter((p) => p.isActive);
  } else if (filters?.status === "false") {
    result = result.filter((p) => !p.isActive);
  }

  return { success: true, data: result };
}

// ----------------------------------------------------------------------------
// ─── TAX CODES ──────────────────────────────────────────────────────────────
// ----------------------------------------------------------------------------

export async function createTaxCode(
  data: TaxCodeInput,
): Promise<ActionResult<TaxCode>> {
  const parsed = taxCodeSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const taxCode: TaxCode = {
    id: nextId("TAX"),
    ...parsed.data,
  };

  taxCodes.push(taxCode);

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.CREATE,
    module: "TaxCodes",
    recordId: taxCode.id,
    newValue: taxCode as unknown as Record<string, unknown>,
  });

  return { success: true, data: taxCode };
}

export async function updateTaxCode(
  id: string,
  data: Partial<TaxCodeInput>,
): Promise<ActionResult<TaxCode>> {
  const parsed = taxCodeSchema.partial().safeParse(data);
  if (!parsed.success) {
    return { success: false, errors: parsed.error.flatten().fieldErrors };
  }

  const index = taxCodes.findIndex((t) => t.id === id);
  if (index === -1) return { success: false, error: "Tax code not found" };

  const oldValue = { ...taxCodes[index] };
  taxCodes[index] = { ...taxCodes[index], ...parsed.data };

  await createAuditLog({
    userId: "system",
    userName: "System",
    action: AuditAction.UPDATE,
    module: "TaxCodes",
    recordId: id,
    oldValue: oldValue as unknown as Record<string, unknown>,
    newValue: taxCodes[index] as unknown as Record<string, unknown>,
  });

  return { success: true, data: taxCodes[index] };
}

export async function getTaxCode(id: string): Promise<ActionResult<TaxCode>> {
  const taxCode = taxCodes.find((t) => t.id === id);
  if (!taxCode) return { success: false, error: "Tax code not found" };
  return { success: true, data: taxCode };
}

export async function getTaxCodes(
  filters?: Record<string, string>,
): Promise<ActionResult<TaxCode[]>> {
  let result = [...taxCodes];

  if (filters?.search) {
    const s = filters.search.toLowerCase();
    result = result.filter((t) => t.taxName.toLowerCase().includes(s));
  }
  if (filters?.taxType) {
    result = result.filter((t) => t.taxType === filters.taxType);
  }
  if (filters?.status === "true") {
    result = result.filter((t) => t.isActive);
  } else if (filters?.status === "false") {
    result = result.filter((t) => !t.isActive);
  }

  return { success: true, data: result };
}

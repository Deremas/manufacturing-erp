// ----------------------------------------------------------------------------
// KONEL ERP — Master Data Types
// ----------------------------------------------------------------------------
// These interfaces mirror the Prisma schema for master data entities.
// TODO: Replace with Prisma-generated types once database is connected.

// ── Shared Base Fields ────────────────────────────────────────────────────────

export interface BaseEntity {
  id: string;
  isActive: boolean;
  isArchived: boolean;
  createdAt: string;
  updatedAt: string;
}

// ── Item ──────────────────────────────────────────────────────────────────────

export interface Item extends BaseEntity {
  itemCode: string;
  itemName: string;
  sku?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  itemType?: string;
  itemTypeId?: string;
  itemTypeName?: string;
  uomId?: string;
  uomName?: string;
  batchTracking: boolean;
  reorderPoint: number;
  standardCost: number;
  sellingPrice: number;
  expiryTracking: boolean;
  serialTracking: boolean;
  purchaseTaxCodeId?: string;
  purchaseTaxCodeName?: string;
  vatApplicable: boolean;
  exciseApplicable: boolean;
  createdById?: string;
  updatedById?: string;
}

export interface CreateItemInput {
  itemCode: string;
  itemName: string;
  sku?: string;
  description?: string;
  categoryId?: string;
  itemType?: string;
  uomId?: string;
  reorderPoint?: number;
  standardCost?: number;
  sellingPrice?: number;
  batchTracking?: boolean;
  expiryTracking?: boolean;
  serialTracking?: boolean;
  purchaseTaxCodeId?: string;
  vatApplicable?: boolean;
  exciseApplicable?: boolean;
  isActive?: boolean;
}

export interface UpdateItemInput extends Partial<CreateItemInput> {
  isArchived?: boolean;
}

// ── Category ──────────────────────────────────────────────────────────────────

export interface Category extends BaseEntity {
  code?: string;
  name: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  description?: string;
  displayOrder: number;
  createdById?: string;
  updatedById?: string;
}

export interface CreateCategoryInput {
  code?: string;
  name: string;
  parentCategoryId?: string;
  description?: string;
  displayOrder?: number;
}

export interface UpdateCategoryInput extends Partial<CreateCategoryInput> {}

// ── ItemType ──────────────────────────────────────────────────────────────────

export interface ItemType extends BaseEntity {
  code: string;
  name: string;
  description?: string;
  createdById?: string;
  updatedById?: string;
}

export interface CreateItemTypeInput {
  code: string;
  name: string;
  description?: string;
}

export interface UpdateItemTypeInput extends Partial<CreateItemTypeInput> {}

// ── Unit ──────────────────────────────────────────────────────────────────────

export interface Unit extends BaseEntity {
  code?: string;
  name: string;
  abbreviation: string;
  type: string;
  decimalPrecision: number;
  createdById?: string;
  updatedById?: string;
}

export interface CreateUnitInput {
  code?: string;
  name: string;
  abbreviation: string;
  type: string;
  decimalPrecision?: number;
}

export interface UpdateUnitInput extends Partial<CreateUnitInput> {}

// ── UnitConversion ────────────────────────────────────────────────────────────

export interface UnitConversion extends BaseEntity {
  fromUnitId: string;
  fromUnitName?: string;
  toUnitId: string;
  toUnitName?: string;
  factor: number;
}

export interface CreateUnitConversionInput {
  fromUnitId: string;
  toUnitId: string;
  factor: number;
}

export interface UpdateUnitConversionInput extends Partial<CreateUnitConversionInput> {}

// ── Customer ──────────────────────────────────────────────────────────────────

export interface Customer extends BaseEntity {
  customerCode: string;
  name: string;
  customerType?: string;
  tin?: string;
  vatRegistered: boolean;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  creditLimit: number;
  paymentTerms?: string;
  defaultPriceListId?: string;
  defaultSalesLocationId?: string;
  taxCodeId?: string;
  remarks?: string;
  createdById?: string;
  updatedById?: string;
  contacts?: CustomerContact[];
  addresses?: CustomerAddress[];
}

export interface CreateCustomerInput {
  customerCode: string;
  name: string;
  customerType?: string;
  tin?: string;
  vatRegistered?: boolean;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  creditLimit?: number;
  paymentTerms?: string;
  defaultPriceListId?: string;
  defaultSalesLocationId?: string;
  taxCodeId?: string;
  remarks?: string;
}

export interface UpdateCustomerInput extends Partial<CreateCustomerInput> {}

// ── CustomerContact ───────────────────────────────────────────────────────────

export interface CustomerContact extends BaseEntity {
  customerId: string;
  name: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
}

export interface CreateCustomerContactInput {
  customerId: string;
  name: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export interface UpdateCustomerContactInput extends Partial<CreateCustomerContactInput> {}

// ── CustomerAddress ───────────────────────────────────────────────────────────

export interface CustomerAddress extends BaseEntity {
  customerId: string;
  type?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  isPrimary: boolean;
}

export interface CreateCustomerAddressInput {
  customerId: string;
  type?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  isPrimary?: boolean;
}

export interface UpdateCustomerAddressInput extends Partial<CreateCustomerAddressInput> {}

// ── Supplier ──────────────────────────────────────────────────────────────────

export interface Supplier extends BaseEntity {
  supplierCode: string;
  name: string;
  contactPerson?: string;
  tin?: string;
  vatRegistered: boolean;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  paymentTerms?: string;
  defaultBankId?: string;
  defaultBankAccountId?: string;
  taxCodeId?: string;
  remarks?: string;
  createdById?: string;
  updatedById?: string;
  contacts?: SupplierContact[];
  addresses?: SupplierAddress[];
}

export interface CreateSupplierInput {
  supplierCode: string;
  name: string;
  contactPerson?: string;
  tin?: string;
  vatRegistered?: boolean;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  region?: string;
  paymentTerms?: string;
  defaultBankId?: string;
  defaultBankAccountId?: string;
  taxCodeId?: string;
  remarks?: string;
}

export interface UpdateSupplierInput extends Partial<CreateSupplierInput> {}

// ── SupplierContact ───────────────────────────────────────────────────────────

export interface SupplierContact extends BaseEntity {
  supplierId: string;
  name: string;
  phone?: string;
  email?: string;
  isPrimary: boolean;
}

export interface CreateSupplierContactInput {
  supplierId: string;
  name: string;
  phone?: string;
  email?: string;
  isPrimary?: boolean;
}

export interface UpdateSupplierContactInput extends Partial<CreateSupplierContactInput> {}

// ── SupplierAddress ───────────────────────────────────────────────────────────

export interface SupplierAddress extends BaseEntity {
  supplierId: string;
  type?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  isPrimary: boolean;
}

export interface CreateSupplierAddressInput {
  supplierId: string;
  type?: string;
  address?: string;
  city?: string;
  region?: string;
  country?: string;
  isPrimary?: boolean;
}

export interface UpdateSupplierAddressInput extends Partial<CreateSupplierAddressInput> {}

// ── Department ────────────────────────────────────────────────────────────────

export interface Department extends BaseEntity {
  name: string;
  code: string;
  parentDepartmentId?: string;
  parentDepartmentName?: string;
  description?: string;
  locationId?: string;
  managerId?: string;
  managerName?: string;
  createdById?: string;
  updatedById?: string;
}

export interface CreateDepartmentInput {
  name: string;
  code: string;
  parentDepartmentId?: string;
  description?: string;
  locationId?: string;
  managerId?: string;
}

export interface UpdateDepartmentInput extends Partial<CreateDepartmentInput> {}

// ── Bank ──────────────────────────────────────────────────────────────────────

export interface Bank extends BaseEntity {
  code?: string;
  name: string;
  shortName?: string;
  swiftCode?: string;
  description?: string;
  createdById?: string;
  updatedById?: string;
}

export interface CreateBankInput {
  code?: string;
  name: string;
  shortName?: string;
  swiftCode?: string;
  description?: string;
}

export interface UpdateBankInput extends Partial<CreateBankInput> {}

// ── BankAccount ───────────────────────────────────────────────────────────────

export interface BankAccount extends BaseEntity {
  accountCode: string;
  accountName: string;
  accountType: string;
  bankId: string;
  bankName?: string;
  accountNumber: string;
  branch?: string;
  swiftCode?: string;
  locationId?: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  isDefault: boolean;
  allowPayments: boolean;
  allowReceipts: boolean;
  openingBalanceDate?: string;
  createdById?: string;
  updatedById?: string;
}

export interface CreateBankAccountInput {
  accountCode: string;
  accountName: string;
  accountType: string;
  bankId: string;
  accountNumber: string;
  branch?: string;
  swiftCode?: string;
  locationId?: string;
  currency?: string;
  openingBalance?: number;
  currentBalance?: number;
  isDefault?: boolean;
  allowPayments?: boolean;
  allowReceipts?: boolean;
  openingBalanceDate?: string;
}

export interface UpdateBankAccountInput extends Partial<CreateBankAccountInput> {}

// ── Location ──────────────────────────────────────────────────────────────────

export interface Location extends BaseEntity {
  locationCode: string;
  locationName: string;
  locationType: string;
  address?: string;
  description?: string;
  parentLocationId?: string;
  parentLocationName?: string;
  displayOrder: number;
  city?: string;
  region?: string;
  country?: string;
  gpsLatitude?: string;
  gpsLongitude?: string;
  managerId?: string;
  managerName?: string;
  isStockLocation: boolean;
  isProcurementLocation: boolean;
  isProductionLocation: boolean;
  isSalesLocation: boolean;
  isTransitLocation: boolean;
  isScrapLocation: boolean;
  defaultPriceListId?: string;
  defaultBankAccountId?: string;
  allowNegativeStock: boolean;
  requireTransferApproval: boolean;
  enableLocationNumbering: boolean;
  createdById?: string;
  updatedById?: string;
}

export interface CreateLocationInput {
  locationCode: string;
  locationName: string;
  locationType: string;
  address?: string;
  description?: string;
  parentLocationId?: string;
  displayOrder?: number;
  city?: string;
  region?: string;
  country?: string;
  gpsLatitude?: string;
  gpsLongitude?: string;
  managerId?: string;
  isStockLocation?: boolean;
  isProcurementLocation?: boolean;
  isProductionLocation?: boolean;
  isSalesLocation?: boolean;
  isTransitLocation?: boolean;
  isScrapLocation?: boolean;
  defaultPriceListId?: string;
  defaultBankAccountId?: string;
  allowNegativeStock?: boolean;
  requireTransferApproval?: boolean;
  enableLocationNumbering?: boolean;
}

export interface UpdateLocationInput extends Partial<CreateLocationInput> {}

// ── PriceList ─────────────────────────────────────────────────────────────────

export interface PriceList extends BaseEntity {
  code?: string;
  name?: string;
  currency: string;
  customerGroup?: string;
  price?: number;
  effectiveDate?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  customerId?: string;
  locationId?: string;
  createdById?: string;
  updatedById?: string;
  items?: PriceListItem[];
}

export interface CreatePriceListInput {
  code?: string;
  name?: string;
  currency?: string;
  customerGroup?: string;
  price?: number;
  effectiveDate?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  customerId?: string;
  locationId?: string;
}

export interface UpdatePriceListInput extends Partial<CreatePriceListInput> {}

// ── PriceListItem ─────────────────────────────────────────────────────────────

export interface PriceListItem extends BaseEntity {
  priceListId: string;
  itemId: string;
  itemName?: string;
  unitId?: string;
  unitName?: string;
  sellingPrice: number;
  minimumPrice?: number;
  taxIncluded: boolean;
}

export interface CreatePriceListItemInput {
  priceListId: string;
  itemId: string;
  unitId?: string;
  sellingPrice: number;
  minimumPrice?: number;
  taxIncluded?: boolean;
}

export interface UpdatePriceListItemInput extends Partial<CreatePriceListItemInput> {}

// ── TaxCode ───────────────────────────────────────────────────────────────────

export interface TaxCode extends BaseEntity {
  code?: string;
  taxName: string;
  taxType: string;
  rate: number;
  description?: string;
  appliesTo: string;
  isDefault: boolean;
  createdById?: string;
  updatedById?: string;
}

export interface CreateTaxCodeInput {
  code?: string;
  taxName: string;
  taxType: string;
  rate: number;
  description?: string;
  appliesTo?: string;
  isDefault?: boolean;
}

export interface UpdateTaxCodeInput extends Partial<CreateTaxCodeInput> {}

// ── Brand ─────────────────────────────────────────────────────────────────────

export interface Brand extends BaseEntity {
  code?: string;
  name: string;
  description?: string;
}

export interface CreateBrandInput {
  code?: string;
  name: string;
  description?: string;
}

export interface UpdateBrandInput extends Partial<CreateBrandInput> {}

// ── Color ─────────────────────────────────────────────────────────────────────

export interface Color extends BaseEntity {
  code?: string;
  name: string;
  value?: string;
}

export interface CreateColorInput {
  code?: string;
  name: string;
  value?: string;
}

export interface UpdateColorInput extends Partial<CreateColorInput> {}

// ── Size ──────────────────────────────────────────────────────────────────────

export interface Size extends BaseEntity {
  code?: string;
  name: string;
  value?: string;
}

export interface CreateSizeInput {
  code?: string;
  name: string;
  value?: string;
}

export interface UpdateSizeInput extends Partial<CreateSizeInput> {}

// ── Service Result Types ──────────────────────────────────────────────────────

export interface ServiceResult<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResult<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface QueryParams {
  search?: string;
  isActive?: boolean;
  isArchived?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

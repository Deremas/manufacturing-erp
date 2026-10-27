// ----------------------------------------------------------------------------
// NEW ERP — Master Data Types
// ----------------------------------------------------------------------------

export interface Item {
  id: string;
  publicId: number;
  itemCode: string;
  itemName: string;
  sku?: string;
  description?: string;
  categoryId?: string;
  categoryName?: string;
  itemTypeId?: string;
  itemType?: string;
  itemTypeName?: string;
  uomId?: string;
  uomName?: string;
  reorderPoint: number;
  standardCost?: number;
  sellingPrice?: number;
  purchaseTaxCodeId?: string;
  purchaseTaxCodeName?: string;
  batchTracking?: boolean;
  expiryTracking?: boolean;
  serialTracking?: boolean;
  vatApplicable: boolean;
  exciseApplicable?: boolean;
  isActive: boolean;
  isArchived?: boolean;
  createdBy?: string;
  updatedBy?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  publicId: number;
  name: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  description?: string;
  isActive: boolean;
}

export interface Unit {
  id: string;
  publicId: number;
  code?: string;
  name: string;
  abbreviation: string;
  type: string;
  decimalPrecision?: number;
  isActive: boolean;
}

export interface Customer {
  id: string;
  publicId: number;
  customerCode: string;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  creditLimit: number;
  paymentTerms?: string;
  isActive: boolean;
}

export interface Supplier {
  id: string;
  publicId: number;
  supplierCode: string;
  name: string;
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  paymentTerms?: string;
  isActive: boolean;
}

export interface Department {
  id: string;
  publicId: number;
  name: string;
  code: string;
  managerId?: string;
  managerName?: string;
  isActive: boolean;
}

export interface Bank {
  id: string;
  publicId: number;
  name: string;
  shortName: string;
  isActive: boolean;
}

export interface BankAccount {
  id: string;
  publicId: number;
  accountCode: string;
  accountName: string;
  bankId: string;
  bankName?: string;
  accountNumber: string;
  branch?: string;
  swiftCode?: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  isActive: boolean;
}

export interface Location {
  id: string;
  publicId: number;
  locationCode: string;
  locationName: string;
  locationType?: string;
  address?: string;
  isActive: boolean;
}

export interface PriceList {
  id: string;
  publicId: number;
  code?: string;
  name?: string;
  channel: string;
  currency?: string;
  customerGroup?: string;
  customerId?: string;
  customerName?: string;
  locationId?: string;
  locationName?: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  effectiveDate?: string;
  description?: string;
  isDefault: boolean;
  isActive: boolean;
  itemsCount?: number;
  items?: PriceListItem[];
  usage?: PriceListUsageRecord[];
}

export interface PriceListItem {
  id: string;
  itemId: string;
  itemCode?: string;
  itemName?: string;
  unitId?: string;
  uomCode?: string;
  uomName?: string;
  unitPrice?: number;
  minimumQty: number;
  taxIncluded: boolean;
  isActive: boolean;
}

export interface PriceListUsageRecord {
  documentType: string;
  documentNo: string;
  date: string;
  counterparty?: string;
  totalQuantity: number;
  totalValue: number;
}

export interface TaxCode {
  id: string;
  publicId: number;
  taxName: string;
  taxType: string;
  rate: number;
  isActive: boolean;
}

export interface ItemType {
  id: string;
  publicId: number;
  name: string;
  code: string;
  description?: string;
  isActive: boolean;
}

// ----------------------------------------------------------------------------
// NEW ERP — Master Data Types
// ----------------------------------------------------------------------------

export interface Item {
  id: string;
  itemCode: string;
  itemName: string;
  sku: string;
  categoryId: string;
  categoryName?: string;
  itemType: string;
  uomId: string;
  uomName?: string;
  purchaseUomId?: string;
  salesUomId?: string;
  conversionFactor?: number;
  reorderPoint: number;
  standardCost: number;
  sellingPrice: number;
  vatApplicable: boolean;
  exciseApplicable: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  parentCategoryId?: string;
  parentCategoryName?: string;
  description?: string;
  isActive: boolean;
}

export interface Unit {
  id: string;
  name: string;
  abbreviation: string;
  type: string;
  isActive: boolean;
}

export interface Customer {
  id: string;
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
  name: string;
  code: string;
  managerId?: string;
  managerName?: string;
  isActive: boolean;
}

export interface Bank {
  id: string;
  name: string;
  shortName: string;
  isActive: boolean;
}

export interface BankAccount {
  id: string;
  accountCode: string;
  accountName: string;
  accountType: string;
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
  locationCode: string;
  locationName: string;
  locationType: string;
  address?: string;
  isActive: boolean;
}

export interface PriceList {
  id: string;
  itemId: string;
  itemName?: string;
  customerGroup: string;
  price: number;
  effectiveDate: string;
  isActive: boolean;
}

export interface TaxCode {
  id: string;
  taxName: string;
  taxType: string;
  rate: number;
  isActive: boolean;
}

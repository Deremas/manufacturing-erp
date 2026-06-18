// ----------------------------------------------------------------------------
// KONEL ERP — Master Data Zod Validation Schemas
// ----------------------------------------------------------------------------
import { z } from "zod";

// ─── Item ───────────────────────────────────────────────────────────────────
export const itemSchema = z.object({
  itemCode: z.string().min(1, "Item code is required"),
  itemName: z.string().min(1, "Item name is required"),
  sku: z.string().optional().default(""),
  categoryId: z.string().optional().default(""),
  itemType: z.string().optional().default(""),
  uomId: z.string().optional().default(""),
  purchaseUomId: z.string().optional().default(""),
  salesUomId: z.string().optional().default(""),
  conversionFactor: z.coerce.number().nonnegative().optional().default(1),
  reorderPoint: z.coerce.number().nonnegative().optional().default(0),
  standardCost: z.coerce.number().nonnegative().optional().default(0),
  sellingPrice: z.coerce.number().nonnegative().optional().default(0),
  vatApplicable: z.boolean().optional().default(true),
  exciseApplicable: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

export type ItemInput = z.infer<typeof itemSchema>;

// ─── Category ───────────────────────────────────────────────────────────────
export const categorySchema = z.object({
  name: z.string().min(1, "Category name is required"),
  parentCategoryId: z.string().optional().default(""),
  description: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export type CategoryInput = z.infer<typeof categorySchema>;

// ─── Unit ───────────────────────────────────────────────────────────────────
export const unitSchema = z.object({
  name: z.string().min(1, "Unit name is required"),
  abbreviation: z
    .string()
    .min(1, "Abbreviation is required")
    .max(10, "Abbreviation must be 10 characters or less"),
  type: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export type UnitInput = z.infer<typeof unitSchema>;

// ─── Customer ───────────────────────────────────────────────────────────────
export const customerSchema = z.object({
  customerCode: z.string().optional().default(""),
  name: z.string().min(1, "Customer name is required"),
  phone: z.string().optional().default(""),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal(""))
    .default(""),
  address: z.string().optional().default(""),
  creditLimit: z.coerce.number().nonnegative().optional().default(0),
  paymentTerms: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export type CustomerInput = z.infer<typeof customerSchema>;

// ─── Supplier ───────────────────────────────────────────────────────────────
export const supplierSchema = z.object({
  supplierCode: z.string().optional().default(""),
  name: z.string().min(1, "Supplier name is required"),
  contactPerson: z.string().optional().default(""),
  phone: z.string().optional().default(""),
  email: z
    .string()
    .email("Invalid email")
    .optional()
    .or(z.literal(""))
    .default(""),
  address: z.string().optional().default(""),
  paymentTerms: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export type SupplierInput = z.infer<typeof supplierSchema>;

// ─── Department ─────────────────────────────────────────────────────────────
export const departmentSchema = z.object({
  name: z.string().min(1, "Department name is required"),
  code: z.string().min(1, "Department code is required"),
  managerId: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;

// ─── Bank ───────────────────────────────────────────────────────────────────
export const bankSchema = z.object({
  name: z.string().min(1, "Bank name is required"),
  shortName: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export type BankInput = z.infer<typeof bankSchema>;

// ─── Bank Account ───────────────────────────────────────────────────────────
export const bankAccountSchema = z.object({
  accountCode: z.string().min(1, "Account code is required"),
  accountName: z.string().min(1, "Account name is required"),
  accountType: z.string().optional().default(""),
  bankId: z.string().min(1, "Bank is required"),
  accountNumber: z.string().min(1, "Account number is required"),
  branch: z.string().optional().default(""),
  swiftCode: z.string().optional().default(""),
  currency: z.string().optional().default("KES"),
  openingBalance: z.coerce.number().optional().default(0),
  currentBalance: z.coerce.number().optional().default(0),
  isActive: z.boolean().optional().default(true),
});

export type BankAccountInput = z.infer<typeof bankAccountSchema>;

// ─── Location ───────────────────────────────────────────────────────────────
export const locationSchema = z.object({
  locationCode: z.string().min(1, "Location code is required"),
  locationName: z.string().min(1, "Location name is required"),
  locationType: z.string().optional().default(""),
  address: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export type LocationInput = z.infer<typeof locationSchema>;

// ─── Price List ─────────────────────────────────────────────────────────────
export const priceListSchema = z.object({
  itemId: z.string().min(1, "Item is required"),
  customerGroup: z.string().optional().default(""),
  price: z.coerce.number().positive("Price must be positive"),
  effectiveDate: z.string().optional().default(""),
  isActive: z.boolean().optional().default(true),
});

export type PriceListInput = z.infer<typeof priceListSchema>;

// ─── Tax Code ───────────────────────────────────────────────────────────────
export const taxCodeSchema = z.object({
  taxName: z.string().min(1, "Tax name is required"),
  taxType: z.string().optional().default(""),
  rate: z.coerce.number().positive("Rate must be positive"),
  isActive: z.boolean().optional().default(true),
});

export type TaxCodeInput = z.infer<typeof taxCodeSchema>;

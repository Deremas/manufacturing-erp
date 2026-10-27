import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { sql } from "@/lib/db";
import { seedOpeningStock } from "@/lib/server/stock-seed";

const permissionModules = [
  "administration",
  "master-data",
  "procurement",
  "inventory",
  "production",
  "sales",
  "finance",
  "accounting",
  "hr",
  "fleet",
  "reports",
  "qc",
  "maintenance",
  "shifts",
];

const permissionActions = [
  "view",
  "create",
  "edit",
  "delete",
  "approve",
  "print",
  "export",
];

const locations = [
  {
    locationCode: "FACTORY-001",
    locationName: "Factory",
    locationType: "Factory",
    address: "Industrial Area, Nairobi",
    isStockLocation: true,
    isProcurementLocation: true,
    isProductionLocation: true,
    isSalesLocation: false,
    isTransitLocation: false,
    isScrapLocation: false,
  },
  {
    locationCode: "RM-STORE",
    locationName: "Raw Material Store",
    locationType: "Raw Material Store",
    address: "Factory Store",
    isStockLocation: true,
    isProcurementLocation: true,
    isProductionLocation: false,
    isSalesLocation: false,
    isTransitLocation: false,
    isScrapLocation: false,
  },
  {
    locationCode: "FG-STORE",
    locationName: "Finished Goods Store",
    locationType: "Finished Goods Store",
    address: "Dispatch Area",
    isStockLocation: true,
    isProcurementLocation: false,
    isProductionLocation: false,
    isSalesLocation: true,
    isTransitLocation: false,
    isScrapLocation: false,
  },
  {
    locationCode: "SCRAP-001",
    locationName: "Scrap Area",
    locationType: "Scrap",
    address: "Yard Corner",
    isStockLocation: false,
    isProcurementLocation: false,
    isProductionLocation: false,
    isSalesLocation: false,
    isTransitLocation: false,
    isScrapLocation: true,
  },
  {
    locationCode: "BRANCH-001",
    locationName: "Nairobi Branch",
    locationType: "Branch",
    address: "Westlands, Nairobi",
    isStockLocation: true,
    isProcurementLocation: false,
    isProductionLocation: false,
    isSalesLocation: true,
    isTransitLocation: false,
    isScrapLocation: false,
  },
];

const categories = [
  {
    code: "RAW",
    name: "Raw Materials",
    description: "Input materials used in production",
  },
  {
    code: "ING",
    name: "Ingredients & Additives",
    description: "Ingredients and additives used in production",
  },
  {
    code: "WIP",
    name: "Work-in-Progress / Semi-Finished Products",
    description: "Items in process between raw material and finished goods",
  },
  {
    code: "PACK",
    name: "Packaging Materials",
    description: "Packaging and wrapping materials",
  },
  { code: "FG", name: "Finished Products", description: "Items ready for sale" },
  {
    code: "CONS",
    name: "Production Consumables",
    description: "Consumable production support stock",
  },
  {
    code: "SPARE",
    name: "Spare Parts",
    description: "Maintenance and spare parts",
  },
];

const units = [
  { code: "PCS", name: "Piece", abbreviation: "pcs", type: "QUANTITY" },
  { code: "KG", name: "Kilogram", abbreviation: "kg", type: "WEIGHT" },
  { code: "L", name: "Liter", abbreviation: "l", type: "VOLUME" },
  { code: "LTR", name: "Liter", abbreviation: "ltr", type: "VOLUME" },
  { code: "BOX", name: "Box", abbreviation: "box", type: "QUANTITY" },
  { code: "MTR", name: "Meter", abbreviation: "m", type: "LENGTH" },
  { code: "ROLL", name: "Roll", abbreviation: "roll", type: "QUANTITY" },
];

const itemTypes = [
  {
    code: "RAW",
    name: "Raw Material",
    description: "Purchasable stock used in production",
  },
  {
    code: "ING",
    name: "Ingredient",
    description: "Ingredient or additive stock used in production",
  },
  {
    code: "WIP",
    name: "WIP",
    description: "Work-in-progress or semi-finished stock",
  },
  {
    code: "PACK",
    name: "Packaging Material",
    description: "Packaging stock used in production",
  },
  {
    code: "FG",
    name: "Finished Good",
    description: "Sellable finished item",
  },
  {
    code: "CONS",
    name: "Consumable",
    description: "Consumable item",
  },
  {
    code: "SPARE",
    name: "Spare Part",
    description: "Equipment spare part",
  },
  {
    code: "SERVICE",
    name: "Service",
    description: "Non-stock service",
  },
];

const assetTypes = [
  {
    code: "VEH",
    name: "Vehicle",
    description: "Fleet vehicle asset",
  },
  {
    code: "MACH",
    name: "Machine",
    description: "Production or plant machine asset",
  },
  {
    code: "UTIL",
    name: "Utility Equipment",
    description: "Generators, compressors, boilers, and utility equipment",
  },
  {
    code: "BLDG",
    name: "Building / Facility",
    description: "Facilities and infrastructure assets",
  },
  {
    code: "TOOL",
    name: "Tool / Instrument",
    description: "Maintenance tools and measurement instruments",
  },
];

const taxCodes = [
  {
    code: "VAT15",
    taxName: "VAT 15%",
    taxType: "VAT",
    rate: 15,
    appliesTo: "BOTH",
    isDefault: true,
  },
  {
    code: "VAT0",
    taxName: "VAT 0%",
    taxType: "VAT",
    rate: 0,
    appliesTo: "BOTH",
  },
  {
    code: "VAT5",
    taxName: "VAT 5%",
    taxType: "VAT",
    rate: 5,
    appliesTo: "BOTH",
  },
  {
    code: "VAT7",
    taxName: "VAT 7%",
    taxType: "VAT",
    rate: 7,
    appliesTo: "BOTH",
  },
  {
    code: "EXC10",
    taxName: "Excise 10%",
    taxType: "EXCISE",
    rate: 10,
    appliesTo: "SALES",
  },
  {
    code: "WHT5",
    taxName: "Withholding 3%",
    taxType: "WITHHOLDING",
    rate: 3,
    appliesTo: "PURCHASE",
  },
];

const departments = [
  { code: "PROD", name: "Production" },
  { code: "PROC", name: "Procurement" },
  { code: "SALES", name: "Sales" },
  { code: "FIN", name: "Finance" },
  { code: "WH", name: "Warehouse" },
];

const banks = [
  { id: "ECB", name: "Ethiopia Commercial Bank", shortName: "KCB" },
  { id: "EQUITY", name: "Equity Bank", shortName: "Equity" },
  { id: "COOP", name: "Co-operative Bank", shortName: "Co-op" },
];

const leaveTypes = [
  {
    code: "AL",
    name: "Annual Leave",
    paid: true,
    entitlementDays: 21,
    requiresAttachment: false,
    approvalLevel: 2,
  },
  {
    code: "SL",
    name: "Sick Leave",
    paid: true,
    entitlementDays: 14,
    requiresAttachment: true,
    approvalLevel: 2,
  },
  {
    code: "ML",
    name: "Maternity Leave",
    paid: true,
    entitlementDays: 90,
    requiresAttachment: true,
    approvalLevel: 3,
  },
  {
    code: "UL",
    name: "Unpaid Leave",
    paid: false,
    entitlementDays: 30,
    requiresAttachment: false,
    approvalLevel: 2,
  },
];

const customers = [
  {
    customerCode: "CUST-001",
    name: "ABC Enterprises Ltd",
    phone: "+254711000001",
    email: "info@abcenterprises.co.ke",
    address: "Nairobi, Kenya",
    creditLimit: 500000,
    paymentTerms: "NET30",
  },
  {
    customerCode: "CUST-002",
    name: "Nairobi Wholesalers",
    phone: "+254711000002",
    email: "orders@nairobwholesale.co.ke",
    address: "Nairobi Industrial Area",
    creditLimit: 1000000,
    paymentTerms: "NET60",
  },
];

const suppliers = [
  {
    supplierCode: "SUP-001",
    name: "Industrial Raw Materials Ltd",
    contactPerson: "John Doe",
    phone: "+254722000001",
    email: "john@irm.co.ke",
    address: "Nairobi Industrial Area",
    paymentTerms: "NET30",
  },
  {
    supplierCode: "SUP-002",
    name: "Packaging Solutions Ltd",
    contactPerson: "Mary Wanjiku",
    phone: "+254722000002",
    email: "mary@packsol.co.ke",
    address: "Thika Road",
    paymentTerms: "NET30",
  },
];

const items = [
  { itemCode: "RM-001", itemName: "Raw Groundnuts (Peanuts)", sku: "RM-001", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "RM-002", itemName: "Raw Sesame Seeds", sku: "RM-002", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "RM-003", itemName: "Raw Soybeans", sku: "RM-003", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "RM-004", itemName: "Raw Sunflower Seeds", sku: "RM-004", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "RM-005", itemName: "Raw Maize (Corn)", sku: "RM-005", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "RM-006", itemName: "Raw Wheat Grain", sku: "RM-006", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "RM-007", itemName: "Raw Sorghum", sku: "RM-007", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "RM-008", itemName: "Raw Barley", sku: "RM-008", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "RM-009", itemName: "Raw Teff Grain", sku: "RM-009", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "RM-010", itemName: "Raw Chickpeas", sku: "RM-010", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "RM-011", itemName: "Raw Red Kidney Beans", sku: "RM-011", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "RM-012", itemName: "Raw White Beans", sku: "RM-012", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "RM-013", itemName: "Raw Green Mung Beans", sku: "RM-013", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "RM-014", itemName: "Raw Niger Seeds (Nug)", sku: "RM-014", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "RM-015", itemName: "Raw Flaxseeds", sku: "RM-015", categoryCode: "RAW", itemTypeCode: "RAW", uomCode: "KG", reorderPoint: 100, vatApplicable: true, exciseApplicable: false },
  { itemCode: "ING-001", itemName: "White Granulated Sugar", sku: "ING-001", categoryCode: "ING", itemTypeCode: "ING", uomCode: "KG", reorderPoint: 50, vatApplicable: true, exciseApplicable: false },
  { itemCode: "ING-002", itemName: "Natural Honey", sku: "ING-002", categoryCode: "ING", itemTypeCode: "ING", uomCode: "KG", reorderPoint: 50, vatApplicable: true, exciseApplicable: false },
  { itemCode: "ING-003", itemName: "Iodized Salt", sku: "ING-003", categoryCode: "ING", itemTypeCode: "ING", uomCode: "KG", reorderPoint: 50, vatApplicable: true, exciseApplicable: false },
  { itemCode: "ING-004", itemName: "Refined Sunflower Oil", sku: "ING-004", categoryCode: "ING", itemTypeCode: "ING", uomCode: "L", reorderPoint: 50, vatApplicable: true, exciseApplicable: false },
  { itemCode: "ING-005", itemName: "Vegetable Oil", sku: "ING-005", categoryCode: "ING", itemTypeCode: "ING", uomCode: "L", reorderPoint: 50, vatApplicable: true, exciseApplicable: false },
  { itemCode: "ING-006", itemName: "Cocoa Powder", sku: "ING-006", categoryCode: "ING", itemTypeCode: "ING", uomCode: "KG", reorderPoint: 50, vatApplicable: true, exciseApplicable: false },
  { itemCode: "ING-007", itemName: "Food-Grade Citric Acid", sku: "ING-007", categoryCode: "ING", itemTypeCode: "ING", uomCode: "KG", reorderPoint: 50, vatApplicable: true, exciseApplicable: false },
  { itemCode: "ING-008", itemName: "Vanilla Flavoring", sku: "ING-008", categoryCode: "ING", itemTypeCode: "ING", uomCode: "L", reorderPoint: 50, vatApplicable: true, exciseApplicable: false },
  { itemCode: "WIP-001", itemName: "Cleaned Groundnuts", sku: "WIP-001", categoryCode: "WIP", itemTypeCode: "WIP", uomCode: "KG", reorderPoint: 40, vatApplicable: true, exciseApplicable: false },
  { itemCode: "WIP-002", itemName: "Roasted Groundnuts", sku: "WIP-002", categoryCode: "WIP", itemTypeCode: "WIP", uomCode: "KG", reorderPoint: 40, vatApplicable: true, exciseApplicable: false },
  { itemCode: "WIP-003", itemName: "Ground Peanut Paste", sku: "WIP-003", categoryCode: "WIP", itemTypeCode: "WIP", uomCode: "KG", reorderPoint: 40, vatApplicable: true, exciseApplicable: false },
  { itemCode: "WIP-004", itemName: "Bulk Peanut Butter", sku: "WIP-004", categoryCode: "WIP", itemTypeCode: "WIP", uomCode: "KG", reorderPoint: 40, vatApplicable: true, exciseApplicable: false },
  { itemCode: "WIP-005", itemName: "Cleaned Sesame Seeds", sku: "WIP-005", categoryCode: "WIP", itemTypeCode: "WIP", uomCode: "KG", reorderPoint: 40, vatApplicable: true, exciseApplicable: false },
  { itemCode: "WIP-006", itemName: "Roasted Sesame Seeds", sku: "WIP-006", categoryCode: "WIP", itemTypeCode: "WIP", uomCode: "KG", reorderPoint: 40, vatApplicable: true, exciseApplicable: false },
  { itemCode: "WIP-007", itemName: "Ground Sesame Paste (Tahini)", sku: "WIP-007", categoryCode: "WIP", itemTypeCode: "WIP", uomCode: "KG", reorderPoint: 40, vatApplicable: true, exciseApplicable: false },
  { itemCode: "FG-001", itemName: "Creamy Peanut Butter 500 g", sku: "FG-001", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100, sellingPrice: 0, vatApplicable: true, exciseApplicable: false },
  { itemCode: "FG-002", itemName: "Creamy Peanut Butter 1 kg", sku: "FG-002", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100, sellingPrice: 0, vatApplicable: true, exciseApplicable: false },
  { itemCode: "FG-003", itemName: "Creamy Peanut Butter 4 kg", sku: "FG-003", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100, sellingPrice: 0, vatApplicable: true, exciseApplicable: false },
  { itemCode: "FG-004", itemName: "Crunchy Peanut Butter 500 g", sku: "FG-004", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100, sellingPrice: 0, vatApplicable: true, exciseApplicable: false },
  { itemCode: "FG-005", itemName: "Crunchy Peanut Butter 1 kg", sku: "FG-005", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100, sellingPrice: 0, vatApplicable: true, exciseApplicable: false },
  { itemCode: "FG-006", itemName: "Natural Peanut Butter 1 kg", sku: "FG-006", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100, sellingPrice: 0, vatApplicable: true, exciseApplicable: false },
  { itemCode: "FG-007", itemName: "Sesame Tahini 500 g", sku: "FG-007", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100, sellingPrice: 0, vatApplicable: true, exciseApplicable: false },
  { itemCode: "FG-008", itemName: "Sesame Tahini 1 kg", sku: "FG-008", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100, sellingPrice: 0, vatApplicable: true, exciseApplicable: false },
  { itemCode: "FG-009", itemName: "Roasted Salted Peanuts 250 g", sku: "FG-009", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100, sellingPrice: 0, vatApplicable: true, exciseApplicable: false },
  { itemCode: "FG-010", itemName: "Roasted Salted Peanuts 500 g", sku: "FG-010", categoryCode: "FG", itemTypeCode: "FG", uomCode: "PCS", reorderPoint: 100, sellingPrice: 0, vatApplicable: true, exciseApplicable: false },
  { itemCode: "PKG-001", itemName: "Plastic Jar 500 g", sku: "PKG-001", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200, vatApplicable: true, exciseApplicable: false },
  { itemCode: "PKG-002", itemName: "Plastic Jar 1 kg", sku: "PKG-002", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200, vatApplicable: true, exciseApplicable: false },
  { itemCode: "PKG-003", itemName: "Plastic Jar 4 kg", sku: "PKG-003", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200, vatApplicable: true, exciseApplicable: false },
  { itemCode: "PKG-004", itemName: "Plastic Jar Lid", sku: "PKG-004", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200, vatApplicable: true, exciseApplicable: false },
  { itemCode: "PKG-005", itemName: "Induction Sealing Foil", sku: "PKG-005", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200, vatApplicable: true, exciseApplicable: false },
  { itemCode: "PKG-006", itemName: "Peanut Butter Product Label", sku: "PKG-006", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200, vatApplicable: true, exciseApplicable: false },
  { itemCode: "PKG-007", itemName: "Corrugated Packaging Carton", sku: "PKG-007", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200, vatApplicable: true, exciseApplicable: false },
  { itemCode: "PKG-008", itemName: "Food-Grade Packaging Pouch 250 g", sku: "PKG-008", categoryCode: "PACK", itemTypeCode: "PACK", uomCode: "PCS", reorderPoint: 200, vatApplicable: true, exciseApplicable: false },
  { itemCode: "CON-001", itemName: "Food-Grade Cleaning Detergent", sku: "CON-001", categoryCode: "CONS", itemTypeCode: "CONS", uomCode: "L", reorderPoint: 20, vatApplicable: true, exciseApplicable: false },
  { itemCode: "CON-002", itemName: "Disposable Food Handling Gloves", sku: "CON-002", categoryCode: "CONS", itemTypeCode: "CONS", uomCode: "BOX", reorderPoint: 20, vatApplicable: true, exciseApplicable: false },
];

const priceLists = [
  {
    code: "RETAIL-2026",
    name: "Retail Price List",
    currency: "ETB",
    customerGroup: "Retail",
    price: 145,
    effectiveFrom: "2026-01-01T00:00:00Z",
  },
  {
    code: "WHOLESALE-2026",
    name: "Wholesale Price List",
    currency: "ETB",
    customerGroup: "Wholesale",
    price: 135,
    effectiveFrom: "2026-01-01T00:00:00Z",
  },
];

function titleCase(value: string): string {
  return value
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function makeSeedId(prefix: string, value: string): string {
  return `${prefix}-${value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")}`;
}

async function seedPermissions() {
  const permissions: Array<{ id: string; module: string; action: string }> = [];
  const extraPermissions = [
    { module: "sales", action: "factory.use", label: "Sales Factory Use" },
    { module: "sales", action: "branch.use", label: "Sales Branch Use" },
    { module: "sales", action: "truck.use", label: "Sales Truck Use" },
    { module: "sales", action: "agent.use", label: "Sales Agent Use" },
    {
      module: "sales",
      action: "loading.create",
      label: "Sales Loading Create",
    },
    {
      module: "sales",
      action: "loading.confirm",
      label: "Sales Loading Confirm",
    },
    {
      module: "sales",
      action: "loading.cancel",
      label: "Sales Loading Cancel",
    },
    { module: "qc", action: "setup.view", label: "QC Setup View" },
    { module: "qc", action: "setup.manage", label: "QC Setup Manage" },
    { module: "qc", action: "task.view", label: "QC Task View" },
    { module: "qc", action: "task.assign", label: "QC Task Assign" },
    { module: "qc", action: "task.start", label: "QC Task Start" },
    { module: "qc", action: "test.create", label: "QC Test Create" },
    { module: "qc", action: "test.check", label: "QC Test Check" },
    { module: "qc", action: "test.approve", label: "QC Test Approve" },
    { module: "qc", action: "hold.create", label: "QC Hold Create" },
    { module: "qc", action: "release.approve", label: "QC Release Approve" },
    { module: "qc", action: "reject.approve", label: "QC Reject Approve" },
    { module: "qc", action: "rework.approve", label: "QC Rework Approve" },
    { module: "qc", action: "scrap.approve", label: "QC Scrap Approve" },
    { module: "qc", action: "nc.manage", label: "QC Nonconformity Manage" },
    { module: "qc", action: "dashboard.view", label: "QC Dashboard View" },
    { module: "qc", action: "daily.view", label: "QC Daily Records View" },
    { module: "qc", action: "daily.export", label: "QC Daily Records Export" },
    { module: "qc", action: "setup.create", label: "QC Master Data Create" },
    { module: "qc", action: "setup.update", label: "QC Master Data Update" },
    { module: "qc", action: "record.backdate", label: "QC Backdate Records" },
    { module: "qc", action: "water.view", label: "QC Water View" },
    { module: "qc", action: "water.create", label: "QC Water Create" },
    { module: "qc", action: "water.update", label: "QC Water Update" },
    { module: "qc", action: "water.submit", label: "QC Water Submit" },
    { module: "qc", action: "water.approve", label: "QC Water Approve" },
    { module: "qc", action: "chlorine.view", label: "QC Chlorine View" },
    { module: "qc", action: "chlorine.create", label: "QC Chlorine Create" },
    { module: "qc", action: "chlorine.update", label: "QC Chlorine Update" },
    { module: "qc", action: "chlorine.submit", label: "QC Chlorine Submit" },
    { module: "qc", action: "chlorine.approve", label: "QC Chlorine Approve" },
    { module: "qc", action: "treatment.view", label: "QC Treatment View" },
    { module: "qc", action: "treatment.create", label: "QC Treatment Create" },
    { module: "qc", action: "physicochemical.view", label: "QC Physico-Chemical View" },
    { module: "qc", action: "physicochemical.create", label: "QC Physico-Chemical Create" },
    { module: "qc", action: "microbial.view", label: "QC Microbial View" },
    { module: "qc", action: "microbial.create", label: "QC Microbial Create" },
    { module: "qc", action: "preform.view", label: "QC Preform View" },
    { module: "qc", action: "preform.create", label: "QC Preform Create" },
    { module: "qc", action: "handle.view", label: "QC Handle View" },
    { module: "qc", action: "handle.create", label: "QC Handle Create" },
    { module: "qc", action: "cap.view", label: "QC Cap View" },
    { module: "qc", action: "cap.create", label: "QC Cap Create" },
    { module: "qc", action: "packaging.view", label: "QC Packaging View" },
    { module: "qc", action: "packaging.create", label: "QC Packaging Create" },
    { module: "qc", action: "cip.view", label: "QC CIP View" },
    { module: "qc", action: "cip.create", label: "QC CIP Create" },
    { module: "qc", action: "retention.view", label: "QC Retention View" },
    { module: "qc", action: "retention.create", label: "QC Retention Create" },
    { module: "qc", action: "hold.view", label: "QC Hold Decision View" },
    { module: "qc", action: "hold.update", label: "QC Hold Decision Update" },
    { module: "qc", action: "nc.view", label: "QC Nonconformity View" },
    { module: "qc", action: "nc.create", label: "QC Nonconformity Create" },
    { module: "qc", action: "review.view", label: "QC Management Review View" },
    { module: "qc", action: "review.create", label: "QC Management Review Create" },
    { module: "qc", action: "audit.view", label: "QC Internal Audit View" },
    { module: "qc", action: "audit.create", label: "QC Internal Audit Create" },
    { module: "qc", action: "capa.view", label: "QC Corrective Action View" },
    { module: "qc", action: "capa.create", label: "QC Corrective Action Create" },
    {
      module: "production",
      action: "stage.manage",
      label: "Production Stage Manage",
    },
    { module: "maintenance", action: "pm.view", label: "Preventive Maintenance View" },
    { module: "maintenance", action: "pm.create", label: "Preventive Maintenance Create" },
    { module: "maintenance", action: "pm.update", label: "Preventive Maintenance Update" },
    { module: "maintenance", action: "pm.generateWorkOrder", label: "Generate Preventive Maintenance Work Order" },
    { module: "maintenance", action: "pm.recordChecklist", label: "Record Preventive Maintenance Checklist" },
    { module: "maintenance", action: "pm.reschedule", label: "Request Preventive Maintenance Reschedule" },
    { module: "maintenance", action: "pm.checkReschedule", label: "Check Preventive Maintenance Reschedule" },
    { module: "maintenance", action: "pm.approveReschedule", label: "Approve Preventive Maintenance Reschedule" },
    { module: "maintenance", action: "pm.rejectReschedule", label: "Reject Preventive Maintenance Reschedule" },
    { module: "maintenance", action: "pm.complete", label: "Complete Preventive Maintenance" },
    { module: "maintenance", action: "pm.print", label: "Print Preventive Maintenance" },
    { module: "maintenance", action: "pm.export", label: "Export Preventive Maintenance" },
    { module: "maintenance", action: "ticket.convertWorkOrder", label: "Convert Maintenance Ticket to Work Order" },
    { module: "maintenance", action: "ticket.print", label: "Print Maintenance Tickets" },
    { module: "maintenance", action: "ticket.export", label: "Export Maintenance Tickets" },
    { module: "asset", action: "lifecycle.reactivate", label: "Reactivate Retired Assets" },
    { module: "production", action: "downtime.cancel", label: "Cancel Production Downtime" },
    { module: "procurement", action: "invoice.approve", label: "Approve supplier invoices" },
    { module: "procurement", action: "invoice.reject", label: "Reject supplier invoices" },
    { module: "procurement", action: "payment.approve", label: "Approve supplier payments" },
    { module: "procurement", action: "payment.reject", label: "Reject supplier payments" },
    { module: "procurement", action: "supplierReturn.approve", label: "Approve supplier returns" },
    { module: "procurement", action: "supplierReturn.reject", label: "Reject supplier returns" },
    { module: "reports", action: "maintenance.pmCompliance", label: "Preventive Maintenance Compliance Report" },
  ] as const;

  for (const module of permissionModules) {
    for (const action of permissionActions) {
      const id = `${module}.${action}`;
      await sql`
        INSERT INTO "Permission" ("id", "module", "action", "label", "isArchived")
        VALUES (${id}, ${module}, ${action}, ${`${titleCase(module)} ${titleCase(action)}`}, false)
        ON CONFLICT ("id") DO UPDATE SET
          "module" = EXCLUDED."module",
          "action" = EXCLUDED."action",
          "label" = EXCLUDED."label",
          "isArchived" = false
      `;
      permissions.push({ id, module, action });
    }
  }

  for (const permission of extraPermissions) {
    const id = `${permission.module}.${permission.action}`;
    await sql`
      INSERT INTO "Permission" ("id", "module", "action", "label", "isArchived")
      VALUES (${id}, ${permission.module}, ${permission.action}, ${permission.label}, false)
      ON CONFLICT ("id") DO UPDATE SET
        "module" = EXCLUDED."module",
        "action" = EXCLUDED."action",
        "label" = EXCLUDED."label",
        "isArchived" = false
    `;
    permissions.push({
      id,
      module: permission.module,
      action: permission.action,
    });
  }

  return permissions;
}

async function seedRoles(
  permissions: Array<{ id: string; module: string; action: string }>,
) {
  const roleRows = await sql<Array<{ id: string; name: string }>>`
    INSERT INTO "Role" ("id", "name", "description", "isSystem", "isActive", "isArchived", "createdAt", "updatedAt")
    VALUES
      (${makeSeedId("role", "super-admin")}, 'Super Admin', 'Reserved system role with full access.', true, true, false, NOW(), NOW()),
      (${makeSeedId("role", "admin")}, 'Admin', 'Administrative access for daily operations.', false, true, false, NOW(), NOW()),
      (${makeSeedId("role", "user")}, 'User', 'Standard read access for day-to-day use.', false, true, false, NOW(), NOW())
    ON CONFLICT ("name") DO UPDATE SET
      "description" = EXCLUDED."description",
      "isSystem" = EXCLUDED."isSystem",
      "isActive" = true,
      "isArchived" = false,
      "updatedAt" = NOW()
    RETURNING "id", "name"
  `;

  const roleByName = new Map(roleRows.map((row) => [row.name, row.id]));
  const superAdminId = roleByName.get("Super Admin")!;
  const adminId = roleByName.get("Admin")!;
  const userId = roleByName.get("User")!;

  const rolePermissionRows = [
    ...permissions.map((permission) => ({
      roleId: superAdminId,
      permissionId: permission.id,
      module: permission.module,
      action: permission.action,
    })),
    ...permissions
      .filter(
        (permission) =>
          permission.module === "administration" ||
          permission.module === "master-data" ||
          permission.action === "view",
      )
      .map((permission) => ({
        roleId: adminId,
        permissionId: permission.id,
        module: permission.module,
        action: permission.action,
      })),
    ...permissions
      .filter((permission) => permission.action === "view")
      .map((permission) => ({
        roleId: userId,
        permissionId: permission.id,
        module: permission.module,
        action: permission.action,
      })),
  ];

  for (const row of rolePermissionRows) {
    await sql`
      INSERT INTO "RolePermission" ("id", "roleId", "permission", "module", "action", "isArchived")
      VALUES (${`${row.roleId}:${row.permissionId}`}, ${row.roleId}, ${row.permissionId}, ${row.module}, ${row.action}, false)
      ON CONFLICT ("id") DO UPDATE SET
        "roleId" = EXCLUDED."roleId",
        "permission" = EXCLUDED."permission",
        "module" = EXCLUDED."module",
        "action" = EXCLUDED."action",
        "isArchived" = false
    `;
  }

  return { superAdminId, adminId, userId };
}

async function seedLocations(adminUserId: string) {
  const rows: Array<{ id: string; locationCode: string }> = [];

  for (const location of locations) {
    const result = await sql<Array<{ id: string; locationCode: string }>>`
      INSERT INTO "Location" (
        "id",
        "locationCode",
        "locationName",
        "locationType",
        address,
        "isStockLocation",
        "isProcurementLocation",
        "isProductionLocation",
        "isSalesLocation",
        "isTransitLocation",
        "isScrapLocation",
        "createdById",
        "updatedById",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("location", location.locationCode)},
        ${location.locationCode},
        ${location.locationName},
        ${location.locationType},
        ${location.address},
        ${location.isStockLocation},
        ${location.isProcurementLocation},
        ${location.isProductionLocation},
        ${location.isSalesLocation},
        ${location.isTransitLocation},
        ${location.isScrapLocation},
        ${adminUserId},
        ${adminUserId},
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("locationCode") DO UPDATE SET
        "locationName" = EXCLUDED."locationName",
        "locationType" = EXCLUDED."locationType",
        address = EXCLUDED.address,
        "isStockLocation" = EXCLUDED."isStockLocation",
        "isProcurementLocation" = EXCLUDED."isProcurementLocation",
        "isProductionLocation" = EXCLUDED."isProductionLocation",
        "isSalesLocation" = EXCLUDED."isSalesLocation",
        "isTransitLocation" = EXCLUDED."isTransitLocation",
        "isScrapLocation" = EXCLUDED."isScrapLocation",
        "updatedById" = EXCLUDED."updatedById",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
      RETURNING "id", "locationCode"
    `;
    rows.push(result[0]);
  }

  return rows;
}

async function seedUserRecord(
  user: {
    id: string;
    name: string;
    email: string;
    username: string;
    role: string;
    roleId: string;
    phone: string;
  },
  password: string,
) {
  const syncSeededPassword = process.env.SYNC_SEEDED_PASSWORDS === "true";
  const matches = await sql<Array<{ id: string; email: string; username: string | null; phone: string | null }>>`
    SELECT id, email, username, phone
    FROM "User"
    WHERE email = ${user.email}
       OR username = ${user.username}
       OR phone = ${user.phone}
    FOR UPDATE
  `;
  const matchedIds = [...new Set(matches.map((entry) => entry.id))];
  if (matchedIds.length > 1) {
    throw new Error(
      `Cannot seed ${user.username}: email, username, or phone belong to different existing users. Resolve the duplicate identities first.`,
    );
  }
  if (matchedIds[0]) {
    const existingId = matchedIds[0];
    await sql`
      UPDATE "User"
      SET "name" = ${user.name}, "email" = ${user.email}, "username" = ${user.username},
        "password" = CASE WHEN ${syncSeededPassword} THEN ${password} ELSE "password" END,
        "language" = 'en', "dateFormat" = 'DD/MM/YYYY',
        "itemsPerPage" = 25, "role" = ${user.role}, "phone" = ${user.phone},
        "isActive" = true, "isArchived" = false, "roleId" = ${user.roleId}, "updatedAt" = NOW()
      WHERE id = ${existingId}
    `;
    return existingId;
  }

  const rows = await sql<Array<{ id: string }>>`
    INSERT INTO "User" (
      "id",
      "name",
      "email",
      "username",
      "password",
      "language",
      "dateFormat",
      "itemsPerPage",
      "lastLogin",
      "role",
      "phone",
      "isActive",
      "isArchived",
      "roleId",
      "createdAt",
      "updatedAt"
    )
    VALUES (
      ${user.id},
      ${user.name},
      ${user.email},
      ${user.username},
      ${password},
      'en',
      'DD/MM/YYYY',
      25,
      NOW(),
      ${user.role},
      ${user.phone},
      true,
      false,
      ${user.roleId},
      NOW(),
      NOW()
    )
    ON CONFLICT ("email") DO UPDATE SET
      "name" = EXCLUDED."name",
      "username" = EXCLUDED."username",
      "language" = EXCLUDED."language",
      "dateFormat" = EXCLUDED."dateFormat",
      "itemsPerPage" = EXCLUDED."itemsPerPage",
      "role" = EXCLUDED."role",
      "phone" = EXCLUDED."phone",
      "isActive" = true,
      "isArchived" = false,
      "roleId" = EXCLUDED."roleId",
      "password" = CASE WHEN ${syncSeededPassword} THEN EXCLUDED."password" ELSE "User"."password" END,
      "updatedAt" = NOW()
    RETURNING "id"
  `;

  return rows[0].id;
}

async function seedAdditionalUsers(roleIds: {
  adminId: string;
  userId: string;
}) {
  const password = await bcrypt.hash("1234", 12);
  const managerUserId = await seedUserRecord(
    {
      id: makeSeedId("user", "operations-manager"),
      name: "Operations Manager",
      email: "manager@newerp.local",
      username: "manager",
      role: "Admin",
      roleId: roleIds.adminId,
      phone: "+254700000001",
    },
    password,
  );
  const clerkUserId = await seedUserRecord(
    {
      id: makeSeedId("user", "warehouse-clerk"),
      name: "Warehouse Clerk",
      email: "clerk@newerp.local",
      username: "clerk",
      role: "User",
      roleId: roleIds.userId,
      phone: "+254700000002",
    },
    password,
  );

  return { managerUserId, clerkUserId };
}

async function seedUserLocations(userId: string, locationIds: string[]) {
  for (let index = 0; index < locationIds.length; index += 1) {
    const locationId = locationIds[index];
    await sql`
      INSERT INTO "UserLocation" ("id", "userId", "locationId", "isDefault")
      VALUES (${`${userId}:${locationId}`}, ${userId}, ${locationId}, ${index === 0})
      ON CONFLICT ("userId", "locationId") DO UPDATE SET
        "isDefault" = EXCLUDED."isDefault"
    `;
  }
}

async function seedMasterData() {
  for (const category of categories) {
    await sql`
      INSERT INTO "Category" ("id", "code", "name", "description", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${makeSeedId("category", category.code ?? category.name)}, ${category.code}, ${category.name}, ${category.description}, true, false, NOW(), NOW())
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const unit of units) {
    await sql`
      INSERT INTO "Unit" ("id", "code", "name", "abbreviation", "type", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${makeSeedId("unit", unit.code ?? unit.abbreviation)}, ${unit.code}, ${unit.name}, ${unit.abbreviation}, ${unit.type}, true, false, NOW(), NOW())
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "abbreviation" = EXCLUDED."abbreviation",
        "type" = EXCLUDED."type",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const itemType of itemTypes) {
    await sql`
      INSERT INTO "ItemType" (
        "id",
        "code",
        "name",
        "description",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("itemtype", itemType.code)},
        ${itemType.code},
        ${itemType.name},
        ${itemType.description},
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "description" = EXCLUDED."description",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const taxCode of taxCodes) {
    await sql`
      INSERT INTO "TaxCode" ("id", "code", "taxName", "taxType", "rate", "appliesTo", "isDefault", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${makeSeedId("tax", taxCode.code ?? taxCode.taxName)}, ${taxCode.code}, ${taxCode.taxName}, ${taxCode.taxType}, ${taxCode.rate}, ${taxCode.appliesTo}, ${taxCode.isDefault ?? false}, true, false, NOW(), NOW())
      ON CONFLICT ("code") DO UPDATE SET
        "taxName" = EXCLUDED."taxName",
        "taxType" = EXCLUDED."taxType",
        "rate" = EXCLUDED."rate",
        "appliesTo" = EXCLUDED."appliesTo",
        "isDefault" = EXCLUDED."isDefault",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const department of departments) {
    await sql`
      INSERT INTO "Department" ("id", "code", "name", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${makeSeedId("department", department.code)}, ${department.code}, ${department.name}, true, false, NOW(), NOW())
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const bank of banks) {
    await sql`
      INSERT INTO "Bank" ("id", "name", "shortName", "isActive", "isArchived", "createdAt", "updatedAt")
      VALUES (${bank.id}, ${bank.name}, ${bank.shortName}, true, false, NOW(), NOW())
      ON CONFLICT ("id") DO UPDATE SET
        "name" = EXCLUDED."name",
        "shortName" = EXCLUDED."shortName",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const leaveType of leaveTypes) {
    await sql`
      INSERT INTO "LeaveType" (
        "id",
        "code",
        "name",
        "paid",
        "entitlementDays",
        "requiresAttachment",
        "approvalLevel",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("leave-type", leaveType.code)},
        ${leaveType.code},
        ${leaveType.name},
        ${leaveType.paid},
        ${leaveType.entitlementDays},
        ${leaveType.requiresAttachment},
        ${leaveType.approvalLevel},
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "paid" = EXCLUDED."paid",
        "entitlementDays" = EXCLUDED."entitlementDays",
        "requiresAttachment" = EXCLUDED."requiresAttachment",
        "approvalLevel" = EXCLUDED."approvalLevel",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const customer of customers) {
    await sql`
      INSERT INTO "Customer" (
        "id",
        "customerCode",
        "name",
        phone,
        email,
        address,
        "creditLimit",
        "paymentTerms",
        "vatRegistered",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("customer", customer.customerCode)},
        ${customer.customerCode},
        ${customer.name},
        ${customer.phone},
        ${customer.email},
        ${customer.address},
        ${customer.creditLimit},
        ${customer.paymentTerms},
        false,
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("customerCode") DO UPDATE SET
        "name" = EXCLUDED."name",
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        address = EXCLUDED.address,
        "creditLimit" = EXCLUDED."creditLimit",
        "paymentTerms" = EXCLUDED."paymentTerms",
        "vatRegistered" = false,
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const supplier of suppliers) {
    await sql`
      INSERT INTO "Supplier" (
        "id",
        "supplierCode",
        "name",
        "contactPerson",
        phone,
        email,
        address,
        "paymentTerms",
        "vatRegistered",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("supplier", supplier.supplierCode)},
        ${supplier.supplierCode},
        ${supplier.name},
        ${supplier.contactPerson},
        ${supplier.phone},
        ${supplier.email},
        ${supplier.address},
        ${supplier.paymentTerms},
        false,
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("supplierCode") DO UPDATE SET
        "name" = EXCLUDED."name",
        "contactPerson" = EXCLUDED."contactPerson",
        phone = EXCLUDED.phone,
        email = EXCLUDED.email,
        address = EXCLUDED.address,
        "paymentTerms" = EXCLUDED."paymentTerms",
        "vatRegistered" = false,
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  const categoryRows = await sql<
    Array<{ id: string; code: string | null }>
  >`SELECT id, code FROM "Category" WHERE "isArchived" = false`;
  const unitRows = await sql<
    Array<{ id: string; code: string | null }>
  >`SELECT id, code FROM "Unit" WHERE "isArchived" = false`;
  const itemTypeRows = await sql<
    Array<{ id: string; code: string }>
  >`SELECT id, code FROM "ItemType" WHERE "isArchived" = false`;
  const taxCodeRows = await sql<
    Array<{ id: string; code: string | null }>
  >`SELECT id, code FROM "TaxCode" WHERE "isArchived" = false`;

  const categoryByCode = new Map(
    categoryRows.map((row) => [row.code ?? "", row.id]),
  );
  const unitByCode = new Map(unitRows.map((row) => [row.code ?? "", row.id]));
  const itemTypeByCode = new Map(itemTypeRows.map((row) => [row.code, row.id]));
  const taxCodeByCode = new Map(
    taxCodeRows.map((row) => [row.code ?? "", row.id]),
  );
  const defaultTaxCodeId = taxCodeByCode.get("VAT16") ?? null;

  for (const item of items) {
    await sql`
      INSERT INTO "Item" (
        "id",
        "itemCode",
        "itemName",
        sku,
        "categoryId",
        "itemTypeId",
        "uomId",
        "reorderPoint",
        "standardCost",
        "sellingPrice",
        "vatApplicable",
        "exciseApplicable",
        "purchaseTaxCodeId",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("item", item.itemCode)},
        ${item.itemCode},
        ${item.itemName},
        ${item.sku},
        ${categoryByCode.get(item.categoryCode) ?? null},
        ${itemTypeByCode.get(item.itemTypeCode) ?? null},
        ${unitByCode.get(item.uomCode) ?? null},
        ${item.reorderPoint},
        ${item.standardCost ?? 0},
        ${item.sellingPrice ?? 0},
        ${item.vatApplicable},
        ${item.exciseApplicable},
        ${defaultTaxCodeId},
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("itemCode") DO UPDATE SET
        "itemName" = EXCLUDED."itemName",
        sku = EXCLUDED.sku,
        "categoryId" = EXCLUDED."categoryId",
        "itemTypeId" = EXCLUDED."itemTypeId",
        "uomId" = EXCLUDED."uomId",
        "reorderPoint" = EXCLUDED."reorderPoint",
        "standardCost" = EXCLUDED."standardCost",
        "sellingPrice" = EXCLUDED."sellingPrice",
        "vatApplicable" = EXCLUDED."vatApplicable",
        "exciseApplicable" = EXCLUDED."exciseApplicable",
        "purchaseTaxCodeId" = EXCLUDED."purchaseTaxCodeId",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  const activeItemRows = await sql<
    Array<{ id: string; itemCode: string }>
  >`SELECT id, "itemCode" FROM "Item" WHERE "isArchived" = false`;
  const desiredItemCodes = new Set(items.map((item) => item.itemCode));
  const legacyItemIds = activeItemRows
    .filter((row) => !desiredItemCodes.has(row.itemCode))
    .map((row) => row.id);

  if (legacyItemIds.length > 0) {
    await sql`
      UPDATE "Item"
      SET "isArchived" = true,
          "isActive" = false,
          "updatedAt" = NOW()
      WHERE id = ANY(${legacyItemIds})
    `;
  }

  await sql`
    UPDATE "Item"
    SET "isArchived" = true, "isActive" = false, "updatedAt" = NOW()
    WHERE "isArchived" = false
      AND (
        "itemName" ILIKE '%Test%'
        OR "itemName" ILIKE 'Finished Good FG-%'
        OR "itemName" ILIKE 'Raw Material RAW-%'
        OR "itemCode" ILIKE 'TEST-%'
        OR "itemCode" ILIKE 'FG-T%'
        OR "itemCode" ILIKE 'RAW-T%'
      )
  `;

  for (const assetType of assetTypes) {
    await sql`
      INSERT INTO "AssetType" (
        id,
        code,
        name,
        description,
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("asset-type", assetType.code)},
        ${assetType.code},
        ${assetType.name},
        ${assetType.description},
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("code") DO UPDATE SET
        name = EXCLUDED.name,
        description = EXCLUDED.description,
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const priceList of priceLists) {
    await sql`
      INSERT INTO "PriceList" (
        "id",
        "code",
        "name",
        "currency",
        "customerGroup",
        "price",
        "effectiveFrom",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("pricelist", priceList.code ?? priceList.name ?? "default")},
        ${priceList.code},
        ${priceList.name},
        ${priceList.currency},
        ${priceList.customerGroup},
        ${priceList.price},
        ${priceList.effectiveFrom},
        true,
        false,
        NOW(),
        NOW()
      )
      ON CONFLICT ("code") DO UPDATE SET
        "name" = EXCLUDED."name",
        "currency" = EXCLUDED."currency",
        "customerGroup" = EXCLUDED."customerGroup",
        "price" = EXCLUDED."price",
        "effectiveFrom" = EXCLUDED."effectiveFrom",
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }

  for (const prefix of [
    "PO",
    "SO",
    "GRN",
    "INV",
    "PR",
    "REQ",
    "ST",
    "ADJ",
    "SRET",
    "SINV",
    "SPAY",
    "MT",
    "WO",
    "PM",
    "SPR",
    "DT",
    "AAS",
    "ATR",
    "AST",
    "ATA",
    "MTK",
    "QC-WAT",
    "QC-CLR",
    "QC-TRT",
    "QC-PHY",
    "QC-MIC",
    "QC-PRE",
    "QC-HND",
    "QC-CAP",
    "QC-PKG",
    "QC-CIP",
    "QC-RET",
    "QC-HLD",
    "QC-NCR",
    "QC-MRV",
    "QC-AUD",
    "QC-CAPLAN",
  ]) {
    await sql`
      INSERT INTO "DocumentNumbering" (
        "id",
        "prefix",
        "description",
        "prefixFormat",
        "separator",
        "yearFormat",
        "monthFormat",
        "dayFormat",
        "sequenceLength",
        "currentSequence",
        "isActive",
        "isArchived"
      )
      VALUES (
        ${makeSeedId("docnum", prefix)},
        ${prefix},
        ${titleCase(prefix)},
        'PREFIX',
        '-',
        'YYYY',
        'MM',
        'DD',
        2,
        0,
        true,
        false
      )
      ON CONFLICT ("prefix") DO UPDATE SET
        "description" = EXCLUDED."description",
        "prefixFormat" = 'PREFIX',
        "separator" = EXCLUDED."separator",
        "yearFormat" = EXCLUDED."yearFormat",
        "monthFormat" = EXCLUDED."monthFormat",
        "dayFormat" = EXCLUDED."dayFormat",
        "sequenceLength" = 2,
        "currentSequence" = GREATEST("DocumentNumbering"."currentSequence", EXCLUDED."currentSequence"),
        "isActive" = true,
        "isArchived" = false
    `;
  }
}

async function seedCompanyAndSettings() {
  const companyRows = await sql<
    Array<{ id: string }>
  >`SELECT "id" FROM "Company" ORDER BY "createdAt" ASC LIMIT 1`;
  if (companyRows[0]) {
    await sql`
      UPDATE "Company"
      SET
        "companyName" = 'NEW ERP',
        "logo" = NULL,
        "address" = 'Nairobi, Kenya',
        "phone" = '+254700000000',
        "email" = 'info@newerp.local',
        "tinNumber" = 'TIN-NEW-ERP',
        "vatNumber" = 'VAT-NEW-ERP',
        "defaultCurrency" = 'ETB',
        "isActive" = true,
        "isArchived" = false,
        "updatedAt" = NOW()
      WHERE "id" = ${companyRows[0].id}
    `;
  } else {
    await sql`
      INSERT INTO "Company" (
        "id",
        "companyName",
        "logo",
        "address",
        "phone",
        "email",
        "tinNumber",
        "vatNumber",
        "defaultCurrency",
        "isActive",
        "isArchived",
        "createdAt",
        "updatedAt"
      )
      VALUES (
        ${makeSeedId("company", "new-erp")},
        'NEW ERP',
        NULL,
        'Nairobi, Kenya',
        '+254700000000',
        'info@newerp.local',
        'TIN-NEW-ERP',
        'VAT-NEW-ERP',
        'ETB',
        true,
        false,
        NOW(),
        NOW()
      )
    `;
  }

  const settings = [
    { key: "company_name", value: "NEW ERP", category: "general" },
    { key: "default_currency", value: "ETB", category: "general" },
    { key: "date_format", value: "DD/MM/YYYY", category: "general" },
    { key: "timezone", value: "Africa/Nairobi", category: "general" },
    { key: "enable_audit_log", value: "true", category: "security" },
    {
      key: "inventory_require_adjustment_approval",
      value: "false",
      category: "inventory",
    },
    {
      key: "inventory_require_issue_approval",
      value: "false",
      category: "inventory",
    },
    {
      key: "inventory_require_return_approval",
      value: "false",
      category: "inventory",
    },
    {
      key: "inventory_require_requisition_approval",
      value: "false",
      category: "inventory",
    },
    {
      key: "inventory_policy_transfer",
      value: JSON.stringify({
        documentType: "transfer",
        title: "Transfer Approval",
        requireApproval: false,
        minimumValueThreshold: 0,
        minimumQuantityThreshold: 0,
        requiredRole: "",
        autoApproveForAdmin: false,
        isActive: true,
      }),
      category: "inventory",
    },
    {
      key: "inventory_policy_adjustment",
      value: JSON.stringify({
        documentType: "adjustment",
        title: "Adjustment Approval",
        requireApproval: false,
        minimumValueThreshold: 0,
        minimumQuantityThreshold: 0,
        requiredRole: "",
        autoApproveForAdmin: false,
        isActive: true,
      }),
      category: "inventory",
    },
    {
      key: "inventory_policy_issue",
      value: JSON.stringify({
        documentType: "issue",
        title: "Issue Approval",
        requireApproval: false,
        minimumValueThreshold: 0,
        minimumQuantityThreshold: 0,
        requiredRole: "",
        autoApproveForAdmin: false,
        isActive: true,
      }),
      category: "inventory",
    },
    {
      key: "inventory_policy_return",
      value: JSON.stringify({
        documentType: "return",
        title: "Return Approval",
        requireApproval: false,
        minimumValueThreshold: 0,
        minimumQuantityThreshold: 0,
        requiredRole: "",
        autoApproveForAdmin: false,
        isActive: true,
      }),
      category: "inventory",
    },
    {
      key: "inventory_policy_requisition",
      value: JSON.stringify({
        documentType: "requisition",
        title: "Store Requisition Approval",
        requireApproval: false,
        minimumValueThreshold: 0,
        minimumQuantityThreshold: 0,
        requiredRole: "",
        autoApproveForAdmin: false,
        isActive: true,
      }),
      category: "inventory",
    },
  ];

  for (const setting of settings) {
    await sql`
      INSERT INTO "SystemSetting" ("id", "key", "value", "category", "isArchived")
      VALUES (${randomUUID()}, ${setting.key}, ${setting.value}, ${setting.category}, false)
      ON CONFLICT ("key") DO UPDATE SET
        "value" = EXCLUDED."value",
        "category" = EXCLUDED."category",
        "isArchived" = false
    `;
  }

  const moduleSettings = [
    { module: "procurement", key: "pr.requireApproval", value: "false" },
    { module: "procurement", key: "po.requireApproval", value: "false" },
    { module: "procurement", key: "grn.requireApproval", value: "false" },
    {
      module: "procurement",
      key: "supplierReturn.requireApproval",
      value: "false",
    },
    { module: "procurement", key: "invoice.requireApproval", value: "false" },
    { module: "procurement", key: "payment.requireApproval", value: "false" },
    {
      module: "hr",
      key: "overtimeReasons",
      value: JSON.stringify([
        "Machine Breakdown",
        "Urgent Dispatch",
        "Inventory Count",
        "Other",
      ]),
    },
    { module: "hr", key: "payroll.taxPercent", value: "30" },
    { module: "hr", key: "payroll.employeePensionPercent", value: "7" },
    { module: "hr", key: "payroll.employerPensionPercent", value: "11" },
    { module: "hr", key: "payroll.overtimeMultiplier", value: "1.5" },
    { module: "hr", key: "payroll.normalDayOvertimeMultiplier", value: "1.5" },
    { module: "hr", key: "payroll.weekendOvertimeMultiplier", value: "2" },
    { module: "hr", key: "payroll.holidayOvertimeMultiplier", value: "2.5" },
    { module: "hr", key: "payroll.standardWorkDaysPerMonth", value: "26" },
    { module: "hr", key: "payroll.attendanceRequiredForSalary", value: "true" },
    { module: "hr", key: "payroll.weekendDays", value: "[0]" },
    { module: "hr", key: "payroll.holidayDates", value: "[]" },
    { module: "hr", key: "payroll.salaryExpenseAccountId", value: "" },
    { module: "hr", key: "payroll.employerPensionExpenseAccountId", value: "" },
    { module: "hr", key: "payroll.salaryPayableAccountId", value: "" },
    { module: "hr", key: "payroll.taxPayableAccountId", value: "" },
    { module: "hr", key: "payroll.pensionPayableAccountId", value: "" },
    { module: "maintenance", key: "expenseAccountId", value: "" },
    { module: "maintenance", key: "spareInventoryAccountId", value: "" },
    { module: "maintenance", key: "externalServiceAccountId", value: "" },
    { module: "maintenance", key: "assetCapitalizationAccountId", value: "" },
  ];

  for (const setting of moduleSettings) {
    await sql`
      INSERT INTO "ModuleSetting" ("id", "module", "key", "value", "isArchived", "createdAt", "updatedAt")
      VALUES (${randomUUID()}, ${setting.module}, ${setting.key}, ${setting.value}, false, NOW(), NOW())
      ON CONFLICT ("module", "key") DO UPDATE SET
        "value" = EXCLUDED."value",
        "isArchived" = false,
        "updatedAt" = NOW()
    `;
  }
}

async function main() {
  console.log("Seeding database...");

  await seedCompanyAndSettings();
  const permissions = await seedPermissions();
  const roles = await seedRoles(permissions);
  const adminPassword = await bcrypt.hash("1234", 12);
  const adminUserId = await seedUserRecord(
    {
      id: makeSeedId("user", "admin"),
      name: "System Administrator",
      email: "derejemasresha27@gmail.com",
      username: "admin",
      role: "Super Admin",
      roleId: roles.superAdminId,
      phone: "+254700000000",
    },
    adminPassword,
  );

  const seededLocations = await seedLocations(adminUserId);
  const additionalUsers = await seedAdditionalUsers({
    adminId: roles.adminId,
    userId: roles.userId,
  });

  await seedUserLocations(
    adminUserId,
    seededLocations.map((location) => location.id),
  );
  await seedUserLocations(
    additionalUsers.managerUserId,
    seededLocations.slice(0, 3).map((location) => location.id),
  );
  await seedUserLocations(
    additionalUsers.clerkUserId,
    seededLocations.slice(1, 3).map((location) => location.id),
  );
  await seedMasterData();
  const { normalizeDocumentNumberingDefaults } = await import("@/lib/document-numbering");
  const { repairLegacyItemCodes } = await import("@/lib/server/item-data");
  await normalizeDocumentNumberingDefaults();
  await repairLegacyItemCodes();
  const { seedOperationalQcMaster } = await import("@/services/qc/qc-master.service");
  await seedOperationalQcMaster();

  if (process.env.SEED_OPENING_STOCK === "true") {
    const stockSeed = await seedOpeningStock({
      createdById: adminUserId,
      remarks: "Opening stock seeded from prisma seed",
    });
    console.log("Opening stock seed result:", stockSeed);
  }

  console.log("Seeding complete.");
}

main()
  .catch((error) => {
    console.error("Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await sql.end({ timeout: 5 });
  });

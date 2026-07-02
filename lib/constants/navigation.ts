export interface NavItem {
  title: string;
  href?: string;
  icon: string;
  section?: string;
  children?: { title: string; href: string }[];
}

export const navigation: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: "LayoutDashboard" },
  {
    section: "PROCUREMENT",
    title: "Procurement",
    icon: "ShoppingCart",
    children: [
      { title: "Purchase Requisitions", href: "/procurement/requisitions" },
      { title: "Purchase Orders", href: "/procurement/purchase-orders" },
      { title: "Goods Receipts / GRN", href: "/procurement/grn" },
      { title: "Supplier Returns", href: "/procurement/supplier-returns" },
      { title: "Supplier Invoices", href: "/procurement/supplier-invoices" },
      { title: "Supplier Payments", href: "/procurement/payments" },
      {
        title: "Supplier Performance",
        href: "/procurement/supplier-performance",
      },
      { title: "Commitment Register", href: "/procurement/commitments" },
    ],
  },
  {
    section: "INVENTORY",
    title: "Inventory",
    icon: "Package2",
    children: [
      { title: "Stock Overview", href: "/inventory/stock" },
      { title: "Stock Movements", href: "/inventory/movements" },
      { title: "Bin Card", href: "/inventory/bin-card" },
      { title: "Low Stock", href: "/inventory/low-stock" },
      { title: "Transfers", href: "/inventory/transfers" },
      { title: "Stock Adjustments", href: "/inventory/adjustments" },
      { title: "Store Requisitions", href: "/inventory/requisitions" },
      { title: "Stock Issues", href: "/inventory/issues" },
      { title: "Stock Returns", href: "/inventory/returns" },
      { title: "SRV Card", href: "/inventory/srv" },
    ],
  },
  {
    title: "Production Bin Card",
    href: "/inventory/production-bin-cards",
    icon: "Factory",
  },
  {
    section: "PRODUCTION",
    title: "Production",
    icon: "FlaskConical",
    children: [
      { title: "Bill of Materials", href: "/production/bom" },
      { title: "Cost Settings", href: "/production/cost-settings" },
      { title: "Batch Cost Report", href: "/production/cost-reports/batch-report" },
      { title: "Daily Cost Summary", href: "/production/cost-reports/daily-summary" },
    ],
  },
  {
    section: "PRODUCTION MANAGEMENT",
    title: "Shifts",
    icon: "CalendarClock",
    children: [
      { title: "Shift Sessions", href: "/shifts/sessions" },
      { title: "Daily Report", href: "/shifts/reports/daily" },
      { title: "Efficiency Report", href: "/shifts/reports/efficiency" },
      { title: "Downtime Report", href: "/shifts/reports/downtime" },
    ],
  },
  {
    section: "SALES",
    title: "Sales",
    icon: "ShoppingBag",
    children: [
      { title: "Point of Sale", href: "/sales/pos" },
      { title: "Sales History", href: "/sales/invoices" },
      { title: "Container Tracking", href: "/sales/containers" },
      { title: "Truck Sales", href: "/sales/truck" },
    ],
  },
  { title: "Orders", href: "/orders", icon: "ShoppingCart" },
  {
    section: "QUALITY CHECK",
    title: "QC Tests",
    icon: "CheckCircle2",
    children: [
      { title: "Water Test", href: "/qc/water-test" },
      { title: "Microbial Test", href: "/qc/microbial-test" },
      { title: "Preform Inspection", href: "/qc/preform-inspection" },
      { title: "Handle Inspection", href: "/qc/handle-inspection" },
      { title: "Cap Inspection", href: "/qc/cap-inspection" },
      { title: "Hold / Release", href: "/qc/hold-release" },
      { title: "Nonconformity", href: "/qc/nonconformity" },
    ],
  },
  {
    section: "HUMAN RESOURCES",
    title: "HR Management",
    icon: "Users",
    children: [
      { title: "Employees", href: "/hr/employees" },
      { title: "Attendance", href: "/hr/attendance" },
      { title: "Overtime", href: "/hr/overtime" },
      { title: "Leave Management", href: "/hr/leave" },
      { title: "Payroll", href: "/hr/payroll" },
      { title: "Payroll Settings", href: "/hr/payroll-settings" },
    ],
  },
  {
    section: "FINANCE",
    title: "Finance",
    icon: "Landmark",
    children: [
      { title: "Bank Accounts", href: "/finance/banks" },
      { title: "Cash Book", href: "/finance/cashbook" },
      { title: "Expenses", href: "/finance/expenses" },
      { title: "Aging Reports", href: "/finance/aging" },
      { title: "Financial Statements", href: "/finance/statements" },
      { title: "Finance Settings", href: "/finance/settings" },
    ],
  },
  {
    section: "FINANCE",
    title: "Accounting",
    icon: "Calculator",
    children: [
      { title: "Chart of Accounts", href: "/accounting/chart-of-accounts" },
      { title: "Journal Entries", href: "/accounting/journals" },
      { title: "General Ledger", href: "/accounting/general-ledger" },
      { title: "Trial Balance", href: "/accounting/trial-balance" },
    ],
  },
  {
    section: "OPERATIONS",
    title: "Maintenance",
    icon: "Wrench",
    children: [
      { title: "Work Orders", href: "/maintenance/tickets" },
      { title: "PM Schedule", href: "/maintenance/pm" },
      { title: "Asset Register", href: "/maintenance/assets" },
    ],
  },
  {
    title: "Fleet",
    icon: "Truck",
    children: [
      { title: "Vehicles", href: "/fleet/vehicles" },
      { title: "Drivers", href: "/fleet/drivers" },
      { title: "Trips", href: "/fleet/trips" },
      { title: "Fuel Records", href: "/fleet/fuel" },
    ],
  },
  {
    section: "MASTER DATA",
    title: "Master Data",
    icon: "Database",
    children: [
      { title: "Items", href: "/master-data/items" },
      { title: "Categories", href: "/master-data/categories" },
      { title: "Item Types", href: "/master-data/item-types" },
      { title: "Units", href: "/master-data/units" },
      { title: "Customers", href: "/master-data/customers" },
      { title: "Suppliers", href: "/master-data/suppliers" },
      { title: "Departments", href: "/master-data/departments" },
      { title: "Banks", href: "/master-data/banks" },
      { title: "Bank Accounts", href: "/master-data/bank-accounts" },
      { title: "Price Lists", href: "/master-data/price-lists" },
      { title: "Tax Codes", href: "/master-data/tax-codes" },
    ],
  },
  { title: "Reports", href: "/reports", icon: "BarChart4" },
  {
    section: "SYSTEM",
    title: "Administration",
    icon: "Shield",
    children: [
      { title: "Users", href: "/administration/users" },
      { title: "Roles", href: "/administration/roles" },
      { title: "Permissions", href: "/administration/permissions" },
      { title: "Locations", href: "/administration/locations" },
      { title: "Company Settings", href: "/administration/company-settings" },
      { title: "System Settings", href: "/administration/system-settings" },
      { title: "Inventory Policies", href: "/administration/inventory-policies" },
      {
        title: "Document Numbering",
        href: "/administration/document-numbering",
      },
      { title: "Approval Queue", href: "/administration/approvals" },
      { title: "Audit Logs", href: "/administration/audit-logs" },
    ],
  },
];

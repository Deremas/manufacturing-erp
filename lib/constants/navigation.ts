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
      { title: "Bin Cards", href: "/inventory/bin-cards" },
      { title: "Store Requisitions", href: "/inventory/requisitions" },
      { title: "Issue Vouchers", href: "/inventory/issues" },
      { title: "Return Vouchers", href: "/inventory/returns" },
      { title: "Stock Transfers", href: "/inventory/transfers" },
      { title: "Stock Adjustments", href: "/inventory/adjustments" },
      { title: "SRV Card", href: "/inventory/srv-card" },
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
      { title: "Cost Reports", href: "/production/cost-reports" },
    ],
  },
  {
    section: "PRODUCTION MANAGEMENT",
    title: "Shifts",
    icon: "CalendarClock",
    children: [
      { title: "Shift Sessions", href: "/shifts/sessions" },
      { title: "Daily Report", href: "/shifts/daily-report" },
      { title: "Efficiency Report", href: "/shifts/efficiency" },
      { title: "Downtime Report", href: "/shifts/downtime" },
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
      {
        title: "Document Numbering",
        href: "/administration/document-numbering",
      },
      { title: "Audit Logs", href: "/administration/audit-logs" },
    ],
  },
];
